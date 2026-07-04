'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Copy, LogOut, Play, Users, Menu, Trophy, Clock, Crown, RotateCcw,
} from 'lucide-react'
import { useGame } from '@/hooks/use-game'
import { useToast } from '@/hooks/use-toast'
import { Toolbar } from './toolbar'
import DrawingCanvas, { type DrawingCanvasHandle } from './drawing-canvas'
import { PlayersPanel } from './players-panel'
import { ChatPanel } from './chat-panel'
import { WordPicker } from './word-picker'
import { ReactionsOverlay, RoundEndOverlay, CorrectGuessToast } from './overlays'
import type { ToolType, DrawStroke, RoomSettings, StrokePoint } from '@/lib/game-types'
import { cn } from '@/lib/utils'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '👏', '🎉', '🤔']

export function GameRoomView() {
  const {
    room, playerId, view, leaveRoom, startGame, chooseWord, sendChat,
    sendStrokeStart, sendStrokePoint, sendStrokeEnd, clearCanvas, undoStroke,
    sendReaction, lastReaction, lastRoundEnd, lastCorrectGuess,
    liveStrokeStart, liveStrokePoint, liveStrokeEnd, drawClearNonce, drawUndoNonce,
    connectionState, reconnectAttempt,
  } = useGame()
  const { toast } = useToast()

  const [tool, setTool] = useState<ToolType>('pen')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(5)
  const [showWordPickerDismissed, setShowWordPickerDismissed] = useState(false)
  const [showMobilePlayers, setShowMobilePlayers] = useState(false)
  const canvasRef = useRef<DrawingCanvasHandle>(null)

  const me = room?.players.find((p) => p.id === playerId)
  const isDrawer = me?.isDrawer && room?.phase === 'drawing'
  const isChooser = me?.isDrawer && room?.phase === 'choosing'
  const isHost = room?.hostId === playerId
  const hasGuessed = me?.guessedThisRound ?? false

  const sortedPlayers = useMemo(() => {
    if (!room) return []
    return [...room.players].sort((a, b) => b.score - a.score)
  }, [room?.players])

  const handleCopyCode = useCallback(() => {
    if (!room) return
    navigator.clipboard?.writeText(room.code)
    toast({ title: 'Room code copied!', description: room.code })
  }, [room?.code])

  // Forward live-stream events from the store to the canvas (spectator side)
  useEffect(() => {
    if (liveStrokeStart && liveStrokeStart.fromId !== playerId) {
      canvasRef.current?.applyStrokeStart(liveStrokeStart.stroke)
    }
  }, [liveStrokeStart?.nonce])

  useEffect(() => {
    if (liveStrokePoint && liveStrokePoint.fromId !== playerId) {
      canvasRef.current?.applyStrokePoint(liveStrokePoint.point)
    }
  }, [liveStrokePoint?.nonce])

  useEffect(() => {
    if (liveStrokeEnd && liveStrokeEnd.fromId !== playerId) {
      canvasRef.current?.applyStrokeEnd(liveStrokeEnd.strokeId)
    }
  }, [liveStrokeEnd?.nonce])

  useEffect(() => {
    if (drawClearNonce > 0) {
      // Spectator clear: reset local canvas (no server echo needed)
      canvasRef.current?.resetCanvas()
    }
  }, [drawClearNonce])

  useEffect(() => {
    if (drawUndoNonce > 0) {
      // Spectator undo: pop last stroke locally (no server echo)
      canvasRef.current?.remoteUndo()
    }
  }, [drawUndoNonce])

  // Derived: show word picker when it's our turn to choose (and not dismissed)
  const showWordPicker = isChooser && !!room?.wordChoices?.length && !showWordPickerDismissed

  // Reset canvas when phase changes to a non-drawing state
  const phaseKey = room?.phase
  const lastPhaseRef = useRef<string | undefined>(phaseKey)
  useEffect(() => {
    if (phaseKey === lastPhaseRef.current) return
    lastPhaseRef.current = phaseKey
    if (phaseKey === 'waiting' || phaseKey === 'round-end' || phaseKey === 'choosing') {
      // Reset local canvas state on phase transitions (server also sends a clear for round boundaries)
      canvasRef.current?.resetCanvas()
    }
    if (phaseKey !== 'choosing') {
      // Use a microtask to avoid setState-in-effect lint; this just resets the dismissed flag
      // for the next time we enter choosing.
      queueMicrotask(() => setShowWordPickerDismissed(false))
    }
  }, [phaseKey])

  if (!room || !me) return null

  const handleClear = () => {
    canvasRef.current?.clearLocal()
  }
  const handleUndo = () => {
    canvasRef.current?.undoLocal()
  }
  const handleRedo = () => {
    canvasRef.current?.redoLocal()
  }

  // Word display logic
  const renderWordDisplay = () => {
    if (room.phase === 'waiting') {
      return (
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Waiting for host to start the game...</div>
        </div>
      )
    }
    if (room.phase === 'choosing') {
      const drawer = room.players.find((p) => p.id === room.currentDrawerId)
      return (
        <div className="text-center">
          <div className="text-sm font-medium flex items-center justify-center gap-1.5">
            <span className="text-base">{drawer?.avatar}</span>
            <span className="text-amber-600">{drawer?.name}</span>
            <span>is choosing a word...</span>
          </div>
        </div>
      )
    }
    if (room.phase === 'drawing') {
      if (isDrawer) {
        return (
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your word</div>
            <div className="text-lg sm:text-xl font-bold capitalize">{room.currentWord}</div>
          </div>
        )
      }
      if (hasGuessed) {
        return (
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">You guessed</div>
            <div className="text-lg sm:text-xl font-bold capitalize text-green-600">{room.currentWord}</div>
          </div>
        )
      }
      return (
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Guess the word</div>
          <div className="text-lg sm:text-xl font-mono tracking-[0.3em] font-bold">
            {room.wordHint || '_ '.repeat((room.currentWord || '').length)}
          </div>
        </div>
      )
    }
    if (room.phase === 'round-end') {
      return (
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Round over</div>
          <div className="text-lg sm:text-xl font-bold capitalize">"{room.lastWord}"</div>
        </div>
      )
    }
    if (room.phase === 'game-end') {
      const winner = [...room.players].sort((a, b) => b.score - a.score)[0]
      return (
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">🏆 Winner</div>
          <div className="text-lg sm:text-xl font-bold">
            {winner.avatar} {winner.name} — {winner.score} pts
          </div>
        </div>
      )
    }
    return null
  }

  const timerColor = room.timeLeft <= 10 ? 'text-red-500' : room.timeLeft <= 20 ? 'text-amber-500' : 'text-emerald-500'
  const timerPercent = room.drawTime > 0 ? (room.timeLeft / room.drawTime) * 100 : 0

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b">
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          {/* Left: logo + code */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 via-amber-500 to-emerald-500 flex items-center justify-center text-white text-sm shadow shrink-0">
              🎨
            </div>
            <div className="hidden sm:block min-w-0">
              <div className="font-bold text-sm leading-none">Doodle Duel</div>
              <div className="text-[10px] text-muted-foreground leading-none mt-0.5">Room</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              aria-label={`Copy room code ${room.code}`}
              title="Copy room code"
              onClick={handleCopyCode}
              className="font-mono font-bold tracking-widest h-8 ml-1"
            >
              {room.code}
              <Copy className="h-3 w-3 ml-1.5" />
            </Button>
          </div>

          {/* Center: word/timer */}
          <div className="flex-1 min-w-0 max-w-md flex flex-col items-center justify-center px-2">
            {renderWordDisplay()}
            {(room.phase === 'drawing' || room.phase === 'choosing') && (
              <div className={cn('flex items-center gap-1 text-xs font-semibold', timerColor)}>
                <Clock className="h-3 w-3" />
                {room.timeLeft}s
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden ml-1">
                  <div
                    className={cn('h-full transition-all', timerColor.replace('text-', 'bg-'))}
                    style={{ width: `${timerPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {room.phase === 'waiting' && isHost && (
              <Button size="sm" type="button" onClick={startGame} className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" aria-label="Start game">
                 <Play className="h-3.5 w-3.5" /> Start
               </Button>
             )}
             {room.phase === 'game-end' && isHost && (
               <Button size="sm" type="button" onClick={startGame} className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" aria-label="Play again">
                 <RotateCcw className="h-3.5 w-3.5" /> Play Again
               </Button>
            )}
            <Button variant="outline" size="icon" type="button" className="h-8 w-8 sm:hidden" aria-label="Open chat and players" title="Open chat and players" onClick={() => setShowMobilePlayers(true)}>
              <Users className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-destructive" aria-label="Leave room" title="Leave room" onClick={leaveRoom}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Round indicator bar */}
        <div className="px-3 sm:px-4 pb-2 flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="gap-1">
            <Trophy className="h-3 w-3" />
            Round {Math.min(room.currentRound, room.totalRounds)}/{room.totalRounds}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {room.players.filter(p => p.connected).length} online
          </Badge>
          {room.isPublic ? (
            <Badge variant="outline" className="gap-1 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800">
              🌐 Global Lobby
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 bg-sky-50 dark:bg-sky-950/30">
              🔒 Private Room
            </Badge>
          )}
          {room.phase === 'drawing' && (
            <Badge variant="outline" className="gap-1 bg-amber-50 dark:bg-amber-950/30">
              ✏️ {room.players.find(p => p.id === room.currentDrawerId)?.name} is drawing
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {/* Quick reactions */}
            <div className="hidden sm:flex items-center gap-0.5">
              {REACTION_EMOJIS.slice(0, 5).map((e) => (
                <Button
                  key={e}
                  variant="ghost"
                  size="sm"
                  type="button"
                  aria-label={`React with ${e}`}
                  title={`React with ${e}`}
                  className="h-7 w-7 p-0 text-base"
                  onClick={() => sendReaction(e)}
                >
                  {e}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Reconnection banner */}
      {(connectionState === 'reconnecting' || connectionState === 'disconnected') && (
        <div
          className="px-3 py-2 text-xs text-center font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800"
          role="alert"
          aria-live="assertive"
        >
          {connectionState === 'disconnected'
            ? 'Connection lost. Attempting to reconnect...'
            : `Reconnecting${reconnectAttempt > 0 ? ` (attempt ${reconnectAttempt})` : ''}...`
          }
        </div>
      )}

      {/* Mobile reactions row */}
      <div className="sm:hidden flex items-center justify-center gap-1 py-1.5 border-b bg-card/50">
        {REACTION_EMOJIS.slice(0, 6).map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`React with ${e}`}
            title={`React with ${e}`}
            onClick={() => sendReaction(e)}
            className="h-8 w-8 rounded-full hover:bg-accent text-lg"
          >
            {e}
          </button>
        ))}
      </div>

      {/* Main game area */}
      <main className="flex-1 flex flex-col lg:flex-row gap-2 p-2 sm:p-3 min-h-0">
        {/* Left: Players (desktop sidebar) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col">
          <div className="bg-card border rounded-xl shadow-sm h-full p-2">
            <PlayersPanel
              players={room.players}
              currentDrawerId={room.currentDrawerId}
              hostId={room.hostId}
              myId={playerId}
              phase={room.phase}
            />
            {/* Mobile reactions for desktop */}
            <div className="mt-2 pt-2 border-t flex items-center gap-1 flex-wrap justify-center">
              {REACTION_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`React with ${e}`}
                  title={`React with ${e}`}
                  onClick={() => sendReaction(e)}
                  className="h-8 w-8 rounded-full hover:bg-accent text-lg transition-transform hover:scale-125"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center: Canvas + toolbar */}
        <section className="flex-1 flex flex-col gap-2 min-h-0">
          {/* Toolbar (only for drawer) */}
          {(isDrawer || room.phase === 'waiting' || room.phase === 'game-end') && room.phase === 'drawing' && (
            <Toolbar
              tool={tool}
              setTool={setTool}
              color={color}
              setColor={setColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              onClear={handleClear}
              onUndo={handleUndo}
              onRedo={handleRedo}
              disabled={!isDrawer}
            />
          )}

          {/* Canvas */}
          <div className="relative flex-1 min-h-[300px] sm:min-h-[400px] rounded-xl overflow-hidden shadow-md border-2 border-card bg-white">
            <DrawingCanvas
              ref={canvasRef}
              isDrawer={!!isDrawer}
              onStrokeStart={(stroke) => sendStrokeStart(stroke)}
              onStrokePoint={(point) => sendStrokePoint(point)}
              onStrokeEnd={(strokeId) => sendStrokeEnd(strokeId)}
              onClear={() => clearCanvas()}
              onUndo={() => undoStroke()}
              tool={tool}
              color={color}
              brushSize={brushSize}
              remoteClearSignal={drawClearNonce}
              remoteUndoSignal={drawUndoNonce}
            />
            <ReactionsOverlay reaction={lastReaction} />
            <RoundEndOverlay word={lastRoundEnd?.word ?? null} />
            <CorrectGuessToast
              data={lastCorrectGuess}
              players={room.players}
            />

            {/* Waiting overlay */}
            {(room.phase === 'waiting') && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
                <div className="text-5xl animate-bounce">🎨</div>
                <div className="text-center">
                  <div className="font-bold text-lg">Waiting in lobby</div>
                  <div className="text-sm text-muted-foreground">
                    {isHost ? 'Press Start when everyone has joined!' : 'Waiting for host to start the game...'}
                  </div>
                </div>
                {isHost && (
                   <Button size="lg" type="button" onClick={startGame} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500" aria-label="Start game">
                     <Play className="h-4 w-4" /> Start Game
                   </Button>
                 )}
                {room.players.length < 2 && (
                  <div className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-950/40 px-3 py-1.5 rounded-full">
                    Need at least 2 players (you + 1 friend)
                  </div>
                )}
              </div>
            )}

            {/* Game end overlay */}
            {room.phase === 'game-end' && (
              <div className="absolute inset-0 bg-white/85 dark:bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring' }}
                  className="text-6xl"
                >
                  🏆
                </motion.div>
                <div className="text-center">
                  <div className="font-bold text-xl">Game Over!</div>
                  <Leaderboard players={sortedPlayers} />
                </div>
                 {isHost && (
                   <Button size="lg" type="button" onClick={startGame} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500" aria-label="Play again">
                     <RotateCcw className="h-4 w-4" /> Play Again
                   </Button>
                 )}
                 <Button variant="outline" type="button" aria-label="Leave room" onClick={leaveRoom}>
                  <LogOut className="h-4 w-4 mr-1" /> Leave Room
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Right: Chat (desktop) */}
        <aside className="hidden lg:flex w-72 shrink-0 flex-col">
          <div className="bg-card border rounded-xl shadow-sm h-full overflow-hidden">
            <ChatPanel
              messages={room.messages}
              onSend={sendChat}
              canGuess={room.phase === 'drawing'}
              hasGuessed={hasGuessed}
              isDrawer={!!isDrawer}
              phase={room.phase}
            />
          </div>
        </aside>
      </main>

      {/* Mobile chat (bottom sheet-style drawer using Sheet) */}
      <Sheet open={showMobilePlayers} onOpenChange={setShowMobilePlayers}>
        <SheetContent side="right" className="w-[85vw] sm:w-96 p-0">
          <div className="h-full flex flex-col">
            <div className="p-2 border-b">
              <PlayersPanel
                players={room.players}
                currentDrawerId={room.currentDrawerId}
                hostId={room.hostId}
                myId={playerId}
                phase={room.phase}
              />
            </div>
            <div className="flex-1 min-h-0">
              <ChatPanel
                messages={room.messages}
                onSend={sendChat}
                canGuess={room.phase === 'drawing'}
                hasGuessed={hasGuessed}
                isDrawer={!!isDrawer}
                phase={room.phase}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile chat toggle FAB */}
      <button
        className="lg:hidden fixed bottom-4 right-4 z-30 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        type="button"
        aria-label="Open chat and players"
        title="Open chat and players"
        onClick={() => setShowMobilePlayers(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Word picker modal */}
      {showWordPicker && room.wordChoices.length > 0 && (
        <WordPicker
          choices={room.wordChoices}
          onPick={(w) => {
            chooseWord(w)
            setShowWordPickerDismissed(true)
          }}
        />
      )}
    </div>
  )
}

function Leaderboard({ players }: { players: Room['players'] }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="mt-3 space-y-1 max-w-xs mx-auto">
      {players.slice(0, 5).map((p, i) => (
        <div
          key={p.id}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border',
            i === 0 && 'bg-amber-50 dark:bg-amber-950/40 border-amber-300'
          )}
        >
          <span className="text-lg w-6">{medals[i] || `${i + 1}`}</span>
          <Avatar className="h-7 w-7 border" style={{ borderColor: p.color }}>
            <AvatarFallback style={{ backgroundColor: p.color + '33' }}>{p.avatar}</AvatarFallback>
          </Avatar>
          <span className="flex-1 text-left text-sm font-medium truncate">{p.name}</span>
          <span className="font-bold tabular-nums">{p.score}</span>
        </div>
      ))}
    </div>
  )
}

type Room = import('@/lib/game-types').Room
