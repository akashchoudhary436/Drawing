'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WordPickerProps {
  choices: string[]
  onPick: (word: string) => void
  timeLimit?: number
}

export function WordPicker({ choices, onPick, timeLimit = 15 }: WordPickerProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)

  useEffect(() => {
    if (timeLeft <= 0) {
      onPick(choices[Math.floor(Math.random() * choices.length)])
      return
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-card border-2 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <div className="text-center mb-5">
            <div className="text-4xl mb-2">🎨</div>
            <h2 className="text-xl sm:text-2xl font-bold">Your turn to draw!</h2>
            <p className="text-sm text-muted-foreground mt-1">Pick a word to draw</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="text-xs text-muted-foreground">Auto-pick in</span>
            <div className="relative h-9 w-9">
              <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
                <circle
                  cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2"
                  className="text-primary transition-all"
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={2 * Math.PI * 16 * (1 - timeLeft / timeLimit)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{timeLeft}</span>
            </div>
          </div>

          <div className="space-y-2">
            {choices.map((word, i) => (
              <motion.button
                key={word}
                onClick={() => onPick(word)}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background hover:border-primary hover:bg-accent transition-all text-left flex items-center gap-3 group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="h-7 w-7 rounded-full bg-muted text-xs font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {i + 1}
                </span>
                <span className="text-lg font-semibold flex-1 capitalize">{word}</span>
                <span className="text-xs text-muted-foreground">
                  {word.length} letters
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
