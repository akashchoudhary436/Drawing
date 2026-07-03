'use client'

import { useState, useEffect, useRef } from 'react'
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
import { getSocket } from '@/lib/socket'
import { Toolbar } from './toolbar'
import DrawingCanvas, { type DrawingCanvasHandle } from './drawing-canvas'
import { PlayersPanel } from './players-panel'
import { ChatPanel } from './chat-panel'
import { WordPicker } from './word-picker'
import { ReactionsOverlay, RoundEndOverlay, CorrectGuessToast } from './overlays'
import type { ToolType, DrawStroke, RoomSettings } from '@/lib/game-types'
import { cn } from '@/lib/utils'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '👏', '🎉', '🤔']

export function GameRoomView() {
  const {
    room, playerId, view, leaveRoom, startGame, chooseWord, sendChat,
    sendStroke, clearCanvas, undoStroke, sendReaction, updateSettings, lastReaction,
    lastRoundEnd, lastCorrectGuess,
  } = useGame()
  const { toast } = useToast()

  const [tool, setTool] = useState<ToolType>('pen')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(5)
  const [remoteStrokes, setRemoteStrokes] = useState<DrawStroke[]>([])
  const [remoteClearSignal, setRemoteClearSignal] = useState(0)
  const [remoteUndoSignal, setRemoteUndoSignal] = useState(0)
  const [showWordPickerDismissed, setShowWordPickerDismissed] = useState(false)
  const [showMobilePlayers, setShowMobilePlayers] = useState(false)
  const canvasRef = useRef<DrawingCanvasHandle>(null)

  const me = room?.players.find((p) => p.id === playerId)
  const isDrawer = me?.isDrawer && room?.phase === 'drawing'
  const isChooser = me?.isDrawer && room?.phase === 'choosing'
  const isHost = room?.hostId === playerId
  const hasGuessed = me?.guessedThisRound ?? false

  // Socket listeners for draw events
  useEffect(() => {
    if (!view) return
    let socket: any
    try {
      socket = getSocket()
    } catch {
      return
    }

    const onStroke = (stroke: DrawStroke, fromPlayerId: string) => {
      if (fromPlayerId !== playerId) {
        setRemoteStrokes((prev) => [...prev, stroke])
      }
    }
    const onClear = () => setRemoteClearSignal((v) => v + 1)
    const onUndo = () => setRemoteUndoSignal((v) => v + 1)

    socket.on('draw:stroke', onStroke)
    socket.on('draw:clear', onClear)
    socket.on('draw:undo', onUndo)
    return () => {
      socket.off('draw:stroke', onStroke)
      socket.off('draw:clear', onClear)
      socket.off('draw:undo', onUndo)
    }
  }, [view, playerId])

  // Derived: show word picker when it's our turn to choose (and not dismissed)
  const showWordPicker = isChooser && !!room?.wordChoices?.length && !showWordPickerDismissed

  // Reset remote strokes tracking when phase changes to waiting/round-end (canvas cleared by server signal)
  const phaseKey = room?.phase
  const [lastPhase, setLastPhase] = useState<string | undefined>(phaseKey)
  if (phaseKey !== lastPhase) {
    setLastPhase(phaseKey)
    if (phaseKey === 'waiting' || phaseKey === 'round-end') {
      // Clear buffered remote strokes — actual canvas cleared by remote signal
      if (remoteStrokes.length > 0) setRemoteStrokes([])
    }
    if (phaseKey !== 'choosing') {
      setShowWordPickerDismissed(false)
    }
  }

  if (!room || !me) return null

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(room.code)
    toast({ title: 'Room code copied!', description: room.code })
  }

  const handleClear = () => {
    canvasRef.current?.clearLocal()
  }
  const handleUndo = () => {
    canvasRef.current?.undoLocal()
  }
  const handleRedo = () => {
    canvasRef.current?.redoLocal()
  }
  const handleStroke = (stroke: DrawStroke) => {
    sendStroke(stroke)
  }
  const handleSendClear = () => {
    clearCanvas()
  }
  const handleSendUndo = () => {
    undoStroke()
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
              <Button size="sm" onClick={startGame} className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500">
                <Play className="h-3.5 w-3.5" /> Start
              </Button>
            )}
            {room.phase === 'game-end' && isHost && (
              <Button size="sm" onClick={startGame} className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500">
                <RotateCcw className="h-3.5 w-3.5" /> Play Again
              </Button>
            )}
            <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden" onClick={() => setShowMobilePlayers(true)}>
              <Users className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={leaveRoom} title="Leave room">
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

      {/* Mobile reactions row */}
      <div className="sm:hidden flex items-center justify-center gap-1 py-1.5 border-b bg-card/50">
        {REACTION_EMOJIS.slice(0, 6).map((e) => (
          <button
            key={e}
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
              onStroke={handleStroke}
              onClear={handleSendClear}
              onUndo={handleSendUndo}
              tool={tool}
              color={color}
              brushSize={brushSize}
              remoteStrokes={remoteStrokes}
              remoteClearSignal={remoteClearSignal}
              remoteUndoSignal={remoteUndoSignal}
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
                  <Button size="lg" onClick={startGame} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500">
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
                  <Leaderboard players={room.players} />
                </div>
                {isHost && (
                  <Button size="lg" onClick={startGame} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500">
                    <RotateCcw className="h-4 w-4" /> Play Again
                  </Button>
                )}
                <Button variant="outline" onClick={leaveRoom}>
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
        onClick={() => setShowMobilePlayers(true)}
        aria-label="Open chat & players"
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
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="mt-3 space-y-1 max-w-xs mx-auto">
      {sorted.slice(0, 5).map((p, i) => (
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
