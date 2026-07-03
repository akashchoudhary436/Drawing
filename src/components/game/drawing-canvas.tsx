'use client'

import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import type { DrawStroke, ToolType, StrokePoint } from '@/lib/game-types'

export interface DrawingCanvasHandle {
  clearLocal: () => void
  undoLocal: () => void
  redoLocal: () => void
  exportImage: () => string | null
  // Spectator live-stream handlers
  applyStrokeStart: (stroke: DrawStroke) => void
  applyStrokePoint: (point: StrokePoint) => void
  applyStrokeEnd: (strokeId: string) => void
  // Spectator remote undo (does NOT re-emit to server)
  remoteUndo: () => void
  // Reset all local state (e.g. on phase change)
  resetCanvas: () => void
}

interface DrawingCanvasProps {
  isDrawer: boolean
  onStrokeStart: (stroke: DrawStroke) => void
  onStrokePoint: (point: StrokePoint) => void
  onStrokeEnd: (strokeId: string) => void
  onClear: () => void
  onUndo: () => void
  tool: ToolType
  color: string
  brushSize: number
  remoteClearSignal: number
  remoteUndoSignal: number
}

// Tools that grow point-by-point (streamed as appends)
const APPEND_TOOLS: ToolType[] = ['pen', 'brush', 'eraser']
// Tools with exactly 2 points (shape preview updates the 2nd point live)
const SHAPE_TOOLS: ToolType[] = ['line', 'rect', 'circle']
const isAppend = (t: ToolType) => APPEND_TOOLS.includes(t)
const isShape = (t: ToolType) => SHAPE_TOOLS.includes(t)

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas(
  {
    isDrawer,
    onStrokeStart,
    onStrokePoint,
    onStrokeEnd,
    onClear,
    onUndo,
    tool,
    color,
    brushSize,
    remoteClearSignal,
    remoteUndoSignal,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  // Offscreen base canvas: holds all committed strokes for cheap shape-preview restoration
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const baseCtxRef = useRef<CanvasRenderingContext2D | null>(null)

  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<DrawStroke | null>(null)
  const committedStrokesRef = useRef<DrawStroke[]>([]) // full history (for undo/redo/replay)
  const redoStackRef = useRef<DrawStroke[]>([])
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  // Spectator: live in-progress strokes keyed by id (for shape preview redraw)
  const liveStrokesRef = useRef<Map<string, DrawStroke>>(new Map())
  // Snapshot used by the DRAWER for shape preview (local optimization)
  const drawerSnapshotRef = useRef<ImageData | null>(null)

  const [size, setSize] = useState({ w: 800, h: 600 })

  // ---- Setup canvas + base canvas ----
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctxRef.current = ctx
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const base = document.createElement('canvas')
    baseCanvasRef.current = base
    const bctx = base.getContext('2d')
    if (bctx) {
      bctx.lineCap = 'round'
      bctx.lineJoin = 'round'
      baseCtxRef.current = bctx
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      const w = Math.max(320, Math.floor(rect.width))
      const h = Math.max(240, Math.floor(rect.height))
      setSize({ w, h })
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // ---- Helpers ----
  const toNormalized = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    }
  }, [])

  const fromNormalized = useCallback((nx: number, ny: number) => {
    return { x: nx * size.w, y: ny * size.h }
  }, [size.w, size.h])

  // Draw a single stroke onto a given context
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: DrawStroke) => {
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = stroke.color
    ctx.fillStyle = stroke.color
    ctx.lineWidth = stroke.size
    if (stroke.tool === 'eraser') {
      ctx.strokeStyle = '#ffffff'
      ctx.fillStyle = '#ffffff'
    }

    const pts = stroke.points
    if (pts.length === 0) {
      ctx.restore()
      return
    }

    if (isAppend(stroke.tool)) {
      if (pts.length === 1) {
        const p = fromNormalized(pts[0].x, pts[0].y)
        ctx.beginPath()
        ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        const start = fromNormalized(pts[0].x, pts[0].y)
        ctx.moveTo(start.x, start.y)
        for (let i = 1; i < pts.length; i++) {
          const p = fromNormalized(pts[i].x, pts[i].y)
          const prev = fromNormalized(pts[i - 1].x, pts[i - 1].y)
          const mid = { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2 }
          ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y)
        }
        const last = fromNormalized(pts[pts.length - 1].x, pts[pts.length - 1].y)
        ctx.lineTo(last.x, last.y)
        ctx.stroke()
      }
    } else if (stroke.tool === 'line' && pts.length >= 2) {
      const a = fromNormalized(pts[0].x, pts[0].y)
      const b = fromNormalized(pts[1].x, pts[1].y)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    } else if (stroke.tool === 'rect' && pts.length >= 2) {
      const a = fromNormalized(pts[0].x, pts[0].y)
      const b = fromNormalized(pts[1].x, pts[1].y)
      ctx.beginPath()
      ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y)
      ctx.stroke()
    } else if (stroke.tool === 'circle' && pts.length >= 2) {
      const a = fromNormalized(pts[0].x, pts[0].y)
      const b = fromNormalized(pts[1].x, pts[1].y)
      const r = Math.hypot(b.x - a.x, b.y - a.y)
      ctx.beginPath()
      ctx.arc(a.x, a.y, r, 0, Math.PI * 2)
      ctx.stroke()
    } else if (stroke.tool === 'fill' && pts.length >= 1) {
      const p = fromNormalized(pts[0].x, pts[0].y)
      floodFill(ctx, Math.floor(p.x), Math.floor(p.y), stroke.color, size.w, size.h)
    }
    ctx.restore()
  }, [fromNormalized, size.w, size.h])

  // Commit a stroke to both the visible canvas and the base canvas
  const commitStroke = useCallback((stroke: DrawStroke) => {
    const ctx = ctxRef.current
    const bctx = baseCtxRef.current
    if (ctx) drawStroke(ctx, stroke)
    if (bctx) drawStroke(bctx, stroke)
  }, [drawStroke])

  // Restore visible canvas from base (used for shape previews)
  const restoreFromBase = useCallback(() => {
    const ctx = ctxRef.current
    const base = baseCanvasRef.current
    if (!ctx || !base) return
    ctx.clearRect(0, 0, size.w, size.h)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size.w, size.h)
    ctx.drawImage(base, 0, 0, size.w, size.h)
  }, [size.w, size.h])

  const clearBoth = useCallback(() => {
    const ctx = ctxRef.current
    const bctx = baseCtxRef.current
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size.w, size.h)
    }
    if (bctx) {
      bctx.fillStyle = '#ffffff'
      bctx.fillRect(0, 0, size.w, size.h)
    }
  }, [size.w, size.h])

  // Full replay from committed history (used after undo / resize)
  const replayAll = useCallback(() => {
    clearBoth()
    for (const s of committedStrokesRef.current) {
      const ctx = ctxRef.current
      const bctx = baseCtxRef.current
      if (ctx) drawStroke(ctx, s)
      if (bctx) drawStroke(bctx, s)
    }
  }, [clearBoth, drawStroke])

  // ---- Resize: re-init backing store + replay ----
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    const base = baseCanvasRef.current
    const bctx = baseCtxRef.current
    if (!canvas || !ctx || !base || !bctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    canvas.style.width = `${size.w}px`
    canvas.style.height = `${size.h}px`
    base.width = size.w * dpr
    base.height = size.h * dpr
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    bctx.setTransform(1, 0, 0, 1, 0, 0)
    bctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    bctx.lineCap = 'round'
    bctx.lineJoin = 'round'
    replayAll()
  }, [size.w, size.h, replayAll])

  // ---- Remote clear / undo signals ----
  useEffect(() => {
    if (remoteClearSignal > 0) {
      committedStrokesRef.current = []
      redoStackRef.current = []
      liveStrokesRef.current.clear()
      clearBoth()
    }
  }, [remoteClearSignal])

  useEffect(() => {
    if (remoteUndoSignal > 0) {
      if (committedStrokesRef.current.length > 0) {
        const popped = committedStrokesRef.current.pop()
        if (popped) redoStackRef.current.push(popped)
        replayAll()
      }
    }
  }, [remoteUndoSignal])

  // ---- Drawer pointer handlers ----
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isDrawer) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (canvas) {
      try { canvas.setPointerCapture(e.pointerId) } catch { /* synthetic events may fail */ }
    }
    const pos = toNormalized(e.clientX, e.clientY)
    isDrawingRef.current = true
    lastPosRef.current = pos

    const stroke: DrawStroke = {
      id: Math.random().toString(36).slice(2, 12),
      tool,
      color,
      size: brushSize,
      points: [{ x: pos.x, y: pos.y }],
    }
    currentStrokeRef.current = stroke

    // For shape tools, snapshot the base so we can preview live
    if (isShape(tool)) {
      // base canvas already holds committed strokes — we restore from it on each move
    }

    // Draw the initial mark
    if (isAppend(tool) || tool === 'fill') {
      commitStroke(stroke)
    }

    // Notify server (broadcasts to spectators)
    onStrokeStart(stroke)

    // Fill is a single-shot tool: end immediately
    if (tool === 'fill') {
      committedStrokesRef.current.push(stroke)
      redoStackRef.current = []
      onStrokeEnd(stroke.id)
      isDrawingRef.current = false
      currentStrokeRef.current = null
    }
  }, [isDrawer, tool, color, brushSize, toNormalized, commitStroke, onStrokeStart, onStrokeEnd])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return
    e.preventDefault()
    const pos = toNormalized(e.clientX, e.clientY)
    const stroke = currentStrokeRef.current
    const ctx = ctxRef.current
    if (!ctx) return

    if (isAppend(stroke.tool)) {
      // Append point + draw incremental segment on visible canvas only (commit on end)
      const last = lastPosRef.current
      if (last) {
        const a = fromNormalized(last.x, last.y)
        const b = fromNormalized(pos.x, pos.y)
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color
        ctx.lineWidth = stroke.size
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.restore()
      }
      stroke.points.push({ x: pos.x, y: pos.y })
      lastPosRef.current = pos
      // Stream point to spectators (append)
      onStrokePoint({ strokeId: stroke.id, x: pos.x, y: pos.y })
    } else if (isShape(stroke.tool)) {
      // Update 2nd point + redraw from base
      restoreFromBase()
      stroke.points = [stroke.points[0], { x: pos.x, y: pos.y }]
      drawStroke(ctx, stroke)
      // Stream the updated endpoint to spectators (they replace the last point)
      onStrokePoint({ strokeId: stroke.id, x: pos.x, y: pos.y })
    }
  }, [isDrawer, toNormalized, fromNormalized, restoreFromBase, drawStroke, onStrokePoint])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawer || !isDrawingRef.current) return
    e.preventDefault()
    const stroke = currentStrokeRef.current
    isDrawingRef.current = false
    currentStrokeRef.current = null
    lastPosRef.current = null
    if (!stroke || stroke.points.length === 0) return

    // Commit the stroke permanently to base + history
    if (isAppend(stroke.tool)) {
      // Append tools drew incrementally on visible canvas only; now commit to base
      const bctx = baseCtxRef.current
      if (bctx) drawStroke(bctx, stroke)
    } else if (isShape(stroke.tool)) {
      // Shape tools previewed on visible canvas; commit to base (visible already shows it)
      const bctx = baseCtxRef.current
      if (bctx) drawStroke(bctx, stroke)
    }
    committedStrokesRef.current.push(stroke)
    redoStackRef.current = []
    onStrokeEnd(stroke.id)
  }, [isDrawer, drawStroke, onStrokeEnd])

  // ---- Imperative handle (called by parent for spectator events + drawer actions) ----
  useImperativeHandle(ref, () => ({
    clearLocal: () => {
      committedStrokesRef.current = []
      redoStackRef.current = []
      liveStrokesRef.current.clear()
      clearBoth()
      onClear()
    },
    undoLocal: () => {
      if (committedStrokesRef.current.length > 0) {
        const popped = committedStrokesRef.current.pop()
        if (popped) redoStackRef.current.push(popped)
        replayAll()
        onUndo()
      }
    },
    remoteUndo: () => {
      // Spectator: pop the last committed stroke locally and replay (no server echo)
      if (committedStrokesRef.current.length > 0) {
        committedStrokesRef.current.pop()
        redoStackRef.current = []
        replayAll()
      }
    },
    redoLocal: () => {
      const stroke = redoStackRef.current.pop()
      if (stroke) {
        commitStroke(stroke)
        committedStrokesRef.current.push(stroke)
        onStrokeStart(stroke)
        onStrokeEnd(stroke.id)
      }
    },
    exportImage: () => {
      const canvas = canvasRef.current
      return canvas ? canvas.toDataURL('image/png') : null
    },
    resetCanvas: () => {
      committedStrokesRef.current = []
      redoStackRef.current = []
      liveStrokesRef.current.clear()
      clearBoth()
    },
    // ---- Spectator live-stream handlers ----
    applyStrokeStart: (stroke: DrawStroke) => {
      // Track the live stroke
      liveStrokesRef.current.set(stroke.id, { ...stroke, points: [...stroke.points] })
      if (isAppend(stroke.tool) || stroke.tool === 'fill') {
        // Draw the initial mark on visible + base
        commitStroke(stroke)
        if (stroke.tool === 'fill') {
          // Fill is single-shot; treat as committed immediately
          committedStrokesRef.current.push(stroke)
        }
      }
      // Shape tools: nothing drawn until first point update
    },
    applyStrokePoint: (point: StrokePoint) => {
      const stroke = liveStrokesRef.current.get(point.strokeId)
      if (!stroke) return
      const ctx = ctxRef.current
      if (!ctx) return

      if (isAppend(stroke.tool)) {
        // Append + draw incremental segment on visible + base
        const last = stroke.points[stroke.points.length - 1]
        stroke.points.push({ x: point.x, y: point.y })
        if (last) {
          const a = fromNormalized(last.x, last.y)
          const b = fromNormalized(point.x, point.y)
          // Visible
          ctx.save()
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color
          ctx.lineWidth = stroke.size
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
          ctx.restore()
          // Base
          const bctx = baseCtxRef.current
          if (bctx) {
            bctx.save()
            bctx.lineCap = 'round'
            bctx.lineJoin = 'round'
            bctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color
            bctx.lineWidth = stroke.size
            bctx.beginPath()
            bctx.moveTo(a.x, a.y)
            bctx.lineTo(b.x, b.y)
            bctx.stroke()
            bctx.restore()
          }
        }
      } else if (isShape(stroke.tool)) {
        // Replace 2nd point, restore from base, redraw shape preview on visible canvas
        stroke.points = [stroke.points[0], { x: point.x, y: point.y }]
        restoreFromBase()
        drawStroke(ctx, stroke)
      }
    },
    applyStrokeEnd: (strokeId: string) => {
      const stroke = liveStrokesRef.current.get(strokeId)
      if (!stroke) return
      liveStrokesRef.current.delete(strokeId)
      if (isShape(stroke.tool)) {
        // Final shape already drawn on visible canvas; commit to base
        const bctx = baseCtxRef.current
        if (bctx) drawStroke(bctx, stroke)
      }
      // Append tools were committed incrementally; just record in history
      committedStrokesRef.current.push(stroke)
      redoStackRef.current = []
    },
  }), [size.w, size.h, clearBoth, replayAll, commitStroke, drawStroke, restoreFromBase, fromNormalized, onClear, onUndo, onStrokeStart, onStrokeEnd])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-white rounded-lg overflow-hidden touch-none select-none"
    >
      <canvas
        ref={canvasRef}
        className={`block w-full h-full ${isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      />
      {!isDrawer && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-black/5 px-4 py-2 rounded-full text-xs text-muted-foreground backdrop-blur-sm">
            👀 Watching the artist...
          </div>
        </div>
      )}
    </div>
  )
})

// Flood fill implementation
function floodFill(ctx: CanvasRenderingContext2D, x: number, y: number, fillColor: string, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1
  const realX = Math.floor(x * dpr)
  const realY = Math.floor(y * dpr)
  const realW = Math.floor(w * dpr)
  const realH = Math.floor(h * dpr)
  if (realX < 0 || realY < 0 || realX >= realW || realY >= realH) return

  const imageData = ctx.getImageData(0, 0, realW, realH)
  const data = imageData.data
  const startIdx = (realY * realW + realX) * 4
  const startR = data[startIdx]
  const startG = data[startIdx + 1]
  const startB = data[startIdx + 2]
  const startA = data[startIdx + 3]

  const fill = hexToRgba(fillColor)
  if (!fill) return
  if (startR === fill.r && startG === fill.g && startB === fill.b && startA === fill.a) return

  const stack = [[realX, realY]]
  const visited = new Uint8Array(realW * realH)
  const tolerance = 5

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!
    if (cx < 0 || cy < 0 || cx >= realW || cy >= realH) continue
    const idx = (cy * realW + cx)
    if (visited[idx]) continue
    visited[idx] = 1
    const di = idx * 4
    if (
      Math.abs(data[di] - startR) > tolerance ||
      Math.abs(data[di + 1] - startG) > tolerance ||
      Math.abs(data[di + 2] - startB) > tolerance ||
      Math.abs(data[di + 3] - startA) > tolerance
    ) continue

    data[di] = fill.r
    data[di + 1] = fill.g
    data[di + 2] = fill.b
    data[di + 3] = fill.a

    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
  ctx.putImageData(imageData, 0, 0)
}

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), a: 255 }
}

export default DrawingCanvas
