'use client'

import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import type { DrawStroke, ToolType } from '@/lib/game-types'

export interface DrawingCanvasHandle {
  clearLocal: () => void
  undoLocal: () => void
  redoLocal: () => void
  loadStrokes: (strokes: DrawStroke[]) => void
  exportImage: () => string | null
}

interface DrawingCanvasProps {
  isDrawer: boolean
  onStroke: (stroke: DrawStroke) => void
  onClear: () => void
  onUndo: () => void
  tool: ToolType
  color: string
  brushSize: number
  remoteStrokes: DrawStroke[]
  remoteClearSignal: number
  remoteUndoSignal: number
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas(
  { isDrawer, onStroke, onClear, onUndo, tool, color, brushSize, remoteStrokes, remoteClearSignal, remoteUndoSignal },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<DrawStroke | null>(null)
  const localStrokesRef = useRef<DrawStroke[]>([])
  const redoStackRef = useRef<DrawStroke[]>([])
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const snapshotRef = useRef<ImageData | null>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

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
    if (stroke.tool === 'pen' || stroke.tool === 'brush' || stroke.tool === 'eraser') {
      if (pts.length === 0) {
        ctx.restore()
        return
      }
      if (pts.length === 1) {
        const p = fromNormalized(pts[0].x, pts[0].y)
        ctx.beginPath()
        ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        return
      }
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
    } else if (stroke.tool === 'spray' && pts.length >= 1) {
      const p = fromNormalized(pts[pts.length - 1].x, pts[pts.length - 1].y)
      const radius = stroke.size * 1.5
      const density = stroke.size * 2
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2
        const dist = Math.random() * radius
        ctx.beginPath()
        ctx.arc(p.x + Math.cos(angle) * dist, p.y + Math.sin(angle) * dist, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (stroke.tool === 'fill' && pts.length >= 1) {
      const p = fromNormalized(pts[0].x, pts[0].y)
      floodFill(ctx, Math.floor(p.x), Math.floor(p.y), stroke.color, size.w, size.h)
    }
    ctx.restore()
  }, [fromNormalized, size.w, size.h])

  const redrawAll = useCallback(() => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size.w, size.h)
    for (const s of localStrokesRef.current) {
      drawStroke(ctx, s)
    }
  }, [size.w, size.h, drawStroke])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    canvas.style.width = `${size.w}px`
    canvas.style.height = `${size.h}px`
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size.w, size.h)
    redrawAll()
  }, [size.w, size.h, redrawAll])

  useEffect(() => {
    if (!isDrawer && remoteStrokes.length > 0) {
      const last = remoteStrokes[remoteStrokes.length - 1]
      const ctx = ctxRef.current
      if (ctx) {
        drawStroke(ctx, last)
        localStrokesRef.current.push(last)
        redoStackRef.current = []
      }
    }
  }, [remoteStrokes])

  useEffect(() => {
    if (remoteClearSignal > 0) {
      const ctx = ctxRef.current
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, size.w, size.h)
      }
      localStrokesRef.current = []
      redoStackRef.current = []
    }
  }, [remoteClearSignal])

  useEffect(() => {
    if (remoteUndoSignal > 0) {
      if (localStrokesRef.current.length > 0) {
        const popped = localStrokesRef.current.pop()
        if (popped) redoStackRef.current.push(popped)
        redrawAll()
      }
    }
  }, [remoteUndoSignal])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isDrawer) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (canvas) canvas.setPointerCapture(e.pointerId)
    const pos = toNormalized(e.clientX, e.clientY)
    isDrawingRef.current = true
    lastPosRef.current = pos

    if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      const ctx = ctxRef.current
      const dpr = window.devicePixelRatio || 1
      if (ctx) snapshotRef.current = ctx.getImageData(0, 0, size.w * dpr, size.h * dpr)
    }

    const stroke: DrawStroke = {
      id: Math.random().toString(36).slice(2, 10),
      tool,
      color,
      size: brushSize,
      points: [{ x: pos.x, y: pos.y }],
    }
    currentStrokeRef.current = stroke

    const ctx = ctxRef.current
    if (ctx) {
      if (tool === 'fill') {
        drawStroke(ctx, stroke)
        localStrokesRef.current.push(stroke)
        redoStackRef.current = []
        onStroke(stroke)
        isDrawingRef.current = false
        currentStrokeRef.current = null
      } else if (tool === 'spray') {
        drawStroke(ctx, stroke)
      } else if (tool === 'pen' || tool === 'brush' || tool === 'eraser') {
        drawStroke(ctx, stroke)
      }
    }
  }, [isDrawer, tool, color, brushSize, toNormalized, size.w, size.h, drawStroke, onStroke])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return
    e.preventDefault()
    const pos = toNormalized(e.clientX, e.clientY)
    const stroke = currentStrokeRef.current
    const ctx = ctxRef.current
    if (!ctx) return

    if (stroke.tool === 'pen' || stroke.tool === 'brush' || stroke.tool === 'eraser') {
      stroke.points.push({ x: pos.x, y: pos.y })
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
      lastPosRef.current = pos
    } else if (stroke.tool === 'spray') {
      stroke.points.push({ x: pos.x, y: pos.y })
      drawStroke(ctx, stroke)
      lastPosRef.current = pos
    } else if (stroke.tool === 'line' || stroke.tool === 'rect' || stroke.tool === 'circle') {
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0)
      }
      stroke.points = [stroke.points[0], { x: pos.x, y: pos.y }]
      drawStroke(ctx, stroke)
    }
  }, [isDrawer, toNormalized, fromNormalized, drawStroke])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawer || !isDrawingRef.current) return
    e.preventDefault()
    const stroke = currentStrokeRef.current
    isDrawingRef.current = false
    currentStrokeRef.current = null
    lastPosRef.current = null
    snapshotRef.current = null
    if (stroke && stroke.points.length > 0) {
      localStrokesRef.current.push(stroke)
      redoStackRef.current = []
      onStroke(stroke)
    }
  }, [isDrawer, onStroke])

  useImperativeHandle(ref, () => ({
    clearLocal: () => {
      const ctx = ctxRef.current
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, size.w, size.h)
      }
      localStrokesRef.current = []
      redoStackRef.current = []
      onClear()
    },
    undoLocal: () => {
      if (localStrokesRef.current.length > 0) {
        const popped = localStrokesRef.current.pop()
        if (popped) redoStackRef.current.push(popped)
        redrawAll()
        onUndo()
      }
    },
    redoLocal: () => {
      const stroke = redoStackRef.current.pop()
      if (stroke) {
        const ctx = ctxRef.current
        if (ctx) drawStroke(ctx, stroke)
        localStrokesRef.current.push(stroke)
        onStroke(stroke)
      }
    },
    loadStrokes: (strokes: DrawStroke[]) => {
      localStrokesRef.current = strokes
      redoStackRef.current = []
      redrawAll()
    },
    exportImage: () => {
      const canvas = canvasRef.current
      return canvas ? canvas.toDataURL('image/png') : null
    },
  }), [size.w, size.h, drawStroke, redrawAll, onClear, onUndo, onStroke])

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
