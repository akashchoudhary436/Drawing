'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import {
  Pen,
  Brush,
  Eraser,
  PaintBucket,
  Minus,
  Square,
  Circle,
  Undo2,
  Redo2,
  Trash2,
} from 'lucide-react'
import type { ToolType } from '@/lib/game-types'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  tool: ToolType
  setTool: (t: ToolType) => void
  color: string
  setColor: (c: string) => void
  brushSize: number
  setBrushSize: (s: number) => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  disabled?: boolean
}

const TOOLS: { id: ToolType; icon: React.ReactNode; label: string }[] = [
  { id: 'pen', icon: <Pen className="h-4 w-4" />, label: 'Pen' },
  { id: 'brush', icon: <Brush className="h-4 w-4" />, label: 'Brush' },
  { id: 'eraser', icon: <Eraser className="h-4 w-4" />, label: 'Eraser' },
  { id: 'fill', icon: <PaintBucket className="h-4 w-4" />, label: 'Fill' },
  { id: 'line', icon: <Minus className="h-4 w-4" />, label: 'Line' },
  { id: 'rect', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
  { id: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
]

const COLORS = [
  '#000000', '#ffffff', '#6b7280', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78350f', '#7c2d12', '#581c87', '#1e3a8a',
  '#fef3c7', '#fecaca', '#dbeafe', '#d1fae5', '#fce7f3', '#e0e7ff',
]

const BRUSH_SIZES = [2, 5, 10, 18, 30]

export const Toolbar = memo(function Toolbar({
  tool, setTool, color, setColor, brushSize, setBrushSize,
  onClear, onUndo, onRedo, disabled,
}: ToolbarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 p-2 rounded-xl bg-card/80 backdrop-blur border shadow-sm',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        {/* Tool buttons */}
        <div className="flex flex-wrap items-center gap-1">
          {TOOLS.map((t) => (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === t.id ? 'default' : 'ghost'}
                  size="icon"
                  type="button"
                  aria-label={`${t.label} tool`}
                  aria-pressed={tool === t.id}
                  title={t.label}
                  className="h-10 w-10 sm:h-9 sm:w-9"
                  onClick={() => setTool(t.id)}
                >
                  {t.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="h-8 mx-1" />

        {/* Color palette */}
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-6 lg:grid-cols-10 gap-1 max-w-[280px]" role="radiogroup" aria-label="Drawing color">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Select color ${c}`}
                title={c}
                onClick={() => setColor(c)}
                className={cn(
                  'h-6 w-6 rounded-md border transition-transform hover:scale-110',
                  color === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'border-border'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <label className="relative h-10 w-10 sm:h-9 sm:w-9 rounded-md border border-border overflow-hidden cursor-pointer hover:scale-105 transition-transform">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Pick custom color"
            />
            <div
              className="h-full w-full"
              style={{ background: `conic-gradient(red, orange, yellow, green, cyan, blue, magenta, red)` }}
            />
          </label>
        </div>

        <Separator orientation="vertical" className="h-8 mx-1" />

        {/* Brush size */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Brush size">
            {BRUSH_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={brushSize === s}
                aria-label={`Brush size ${s}`}
                title={`Size ${s}`}
                onClick={() => setBrushSize(s)}
                className={cn(
                  'h-10 w-10 sm:h-9 sm:w-9 rounded-md flex items-center justify-center border transition-all',
                  brushSize === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                )}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: Math.min(s, 16), height: Math.min(s, 16) }}
                />
              </button>
            ))}
          </div>
        </div>

        <Separator orientation="vertical" className="h-8 mx-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" type="button" aria-label="Undo drawing" title="Undo" className="h-10 w-10 sm:h-9 sm:w-9" onClick={onUndo}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" type="button" aria-label="Redo drawing" title="Redo" className="h-10 w-10 sm:h-9 sm:w-9" onClick={onRedo}>
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Redo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" type="button" aria-label="Clear canvas" title="Clear canvas" className="h-10 w-10 sm:h-9 sm:w-9 text-destructive hover:text-destructive" onClick={onClear}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear canvas</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
})
