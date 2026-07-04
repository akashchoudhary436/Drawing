'use client'

import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send } from 'lucide-react'
import type { ChatMessage } from '@/lib/game-types'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSend: (content: string) => void
  canGuess: boolean
  hasGuessed: boolean
  isDrawer: boolean
  phase: string
}

export const ChatPanel = memo(function ChatPanel({ messages, onSend, canGuess, hasGuessed, isDrawer, phase }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }, [input, onSend])

  const placeholder = isDrawer
    ? "You're drawing — no guessing!"
    : hasGuessed
    ? 'You guessed correctly! 🎉'
    : phase === 'drawing'
    ? 'Type your guess...'
    : 'Send a message...'

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b bg-muted/30">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <span className="text-base">💬</span> Chat & Guesses
        </h3>
      </div>
      <ScrollArea className="flex-1 px-2" ref={scrollRef as any}>
        <div className="space-y-1.5 py-2">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No messages yet. Start the conversation!
            </p>
          )}
          {messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                    {msg.content}
                  </span>
                </div>
              )
            }
            if (msg.type === 'correct') {
              return (
                <div
                  key={msg.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-100 dark:bg-green-950/40 border border-green-300 dark:border-green-800"
                >
                  <span className="text-base">{msg.avatar}</span>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    {msg.playerName} {msg.content}
                  </span>
                </div>
              )
            }
            if (msg.type === 'close') {
              return (
                <div
                  key={msg.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                >
                  <span className="text-base">{msg.avatar}</span>
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    <span className="font-medium">{msg.playerName}:</span> {msg.content}
                    <span className="ml-1 text-xs italic">🔥 close!</span>
                  </span>
                </div>
              )
            }
            return (
              <div key={msg.id} className="flex items-start gap-2 px-1">
                <span className="text-base mt-0.5">{msg.avatar}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-foreground">
                    {msg.playerName}
                  </span>
                  <span className="ml-1.5 text-sm text-foreground break-words">
                    {msg.content}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
      <div className="p-2 border-t bg-muted/30 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={placeholder}
          disabled={isDrawer || hasGuessed || !canGuess}
          maxLength={200}
          className="text-sm"
        />
        <Button
          size="icon"
          type="button"
          aria-label="Send message"
          onClick={handleSend}
          disabled={isDrawer || hasGuessed || !canGuess || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
})
