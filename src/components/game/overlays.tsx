'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Reaction } from '@/lib/game-types'

interface ReactionsOverlayProps {
  reaction: Reaction | null
}

interface ActiveReaction extends Reaction {
  animKey: string
}

export function ReactionsOverlay({ reaction }: ReactionsOverlayProps) {
  const [active, setActive] = useState<ActiveReaction[]>([])

  useEffect(() => {
    if (!reaction) return
    const item: ActiveReaction = { ...reaction, animKey: reaction.id + '-' + Math.random() }
    setActive((prev) => [...prev, item])
    const t = setTimeout(() => {
      setActive((prev) => prev.filter((r) => r.animKey !== item.animKey))
    }, 3000)
    return () => clearTimeout(t)
  }, [reaction])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      <AnimatePresence>
        {active.map((r) => (
          <motion.div
            key={r.animKey}
            className="absolute text-3xl sm:text-4xl drop-shadow-lg"
            style={{ left: `${r.x * 80 + 10}%`, bottom: '5%' }}
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{ y: -300, opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 1], rotate: (Math.random() - 0.5) * 60 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: 'easeOut' }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

interface RoundEndOverlayProps {
  word: string | null
  onDone?: () => void
}

export function RoundEndOverlay({ word }: RoundEndOverlayProps) {
  if (!word) return null
  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-card border-2 rounded-2xl shadow-2xl px-8 py-6 text-center"
          initial={{ scale: 0.8, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 18 }}
        >
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-sm text-muted-foreground uppercase tracking-wider">The word was</div>
          <div className="text-2xl sm:text-3xl font-extrabold capitalize bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">
            {word}
          </div>
          <div className="text-xs text-muted-foreground mt-2">Next round starting...</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface CorrectGuessToastProps {
  data: { playerId: string; word: string } | null
  players: { id: string; name: string; avatar: string }[]
}

export function CorrectGuessToast({ data, players }: CorrectGuessToastProps) {
  if (!data) return null
  const player = players.find((p) => p.id === data.playerId)
  if (!player) return null
  return (
    <AnimatePresence>
      <motion.div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
        initial={{ y: -50, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 14 }}
      >
        <span className="text-xl">{player.avatar}</span>
        <span className="font-semibold text-sm">{player.name} guessed it!</span>
        <span className="text-lg">🎉</span>
      </motion.div>
    </AnimatePresence>
  )
}
