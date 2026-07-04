'use client'

import { memo } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Crown, Pencil, Check, Eye } from 'lucide-react'
import type { Player } from '@/lib/game-types'
import { cn } from '@/lib/utils'

interface PlayersPanelProps {
  players: Player[]
  currentDrawerId: string | null
  hostId: string
  myId: string | null
  phase: string
}

export const PlayersPanel = memo(function PlayersPanel({ players, currentDrawerId, hostId, myId, phase }: PlayersPanelProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  return (
    <div className="flex flex-col gap-1.5 h-full">
      <div className="flex items-center justify-between px-2 py-1">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <span className="text-base">👥</span> Players
          <Badge variant="secondary" className="ml-1">{players.filter(p => p.connected).length}</Badge>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-1.5">
        {sorted.map((p, idx) => {
          const isMe = p.id === myId
          const isDrawer = p.id === currentDrawerId && phase !== 'waiting' && phase !== 'game-end'
          return (
            <div
              key={p.id}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all',
                isMe && 'ring-1 ring-primary/50 bg-primary/5',
                isDrawer && 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700',
                !p.connected && 'opacity-40',
                'hover:bg-accent/50'
              )}
            >
              <div className="relative">
                <Avatar className="h-8 w-8 border-2" style={{ borderColor: p.color }}>
                  <AvatarFallback
                    className="text-base"
                    style={{ backgroundColor: p.color + '33' }}
                  >
                    {p.avatar}
                  </AvatarFallback>
                </Avatar>
                {isDrawer && (
                  <span className="absolute -bottom-1 -right-1 bg-amber-400 rounded-full p-0.5">
                    <Pencil className="h-2.5 w-2.5 text-amber-900" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className={cn('text-sm font-medium truncate', isMe && 'text-primary')}>
                    {p.name}{isMe && ' (you)'}
                  </span>
                  {p.id === hostId && (
                    <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {p.guessedThisRound && phase === 'drawing' ? (
                    <span className="flex items-center gap-0.5 text-green-600 font-medium">
                      <Check className="h-3 w-3" /> Guessed!
                    </span>
                  ) : isDrawer ? (
                    <span className="text-amber-600 font-medium">Drawing...</span>
                  ) : phase === 'drawing' ? (
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" /> Guessing
                    </span>
                  ) : (
                    <span>Score: {p.score}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold tabular-nums">{p.score}</div>
                {idx === 0 && p.score > 0 && (
                  <div className="text-[10px] text-amber-500 font-semibold">👑 1st</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
