'use client'

import { create } from 'zustand'
import type {
  Room,
  Player,
  ChatMessage,
  DrawStroke,
  GamePhase,
  Reaction,
  RoomSettings,
} from '@/lib/game-types'
import { getSocket } from '@/lib/socket'

interface GameState {
  // Local player
  playerId: string | null
  playerName: string
  playerAvatar: string
  playerColor: string
  // Room
  room: Room | null
  view: 'landing' | 'room'
  connected: boolean
  // Word choices for drawer
  wordChoices: string[]
  // Transient events
  lastReaction: Reaction | null
  lastCorrectGuess: { playerId: string; word: string } | null
  lastRoundEnd: { word: string } | null
  error: string | null
  // Actions
  init: () => () => void
  createRoom: () => Promise<boolean>
  joinRoom: (code: string) => Promise<boolean>
  leaveRoom: () => void
  startGame: () => void
  chooseWord: (word: string) => void
  sendChat: (content: string) => void
  sendStroke: (stroke: DrawStroke) => void
  clearCanvas: () => void
  undoStroke: () => void
  sendReaction: (emoji: string) => void
  updateSettings: (settings: Partial<RoomSettings>) => void
  setPlayerInfo: (name: string, avatar: string, color: string) => void
  clearError: () => void
}

export const useGame = create<GameState>((set, get) => ({
  playerId: null,
  playerName: '',
  playerAvatar: '🦊',
  playerColor: '#FF6B6B',
  room: null,
  view: 'landing',
  connected: false,
  wordChoices: [],
  lastReaction: null,
  lastCorrectGuess: null,
  lastRoundEnd: null,
  error: null,

  init: () => {
    const socket = getSocket()

    const onConnect = () => set({ connected: true })
    const onDisconnect = () => set({ connected: false })

    const onRoomState = (room: Room) => {
      const pid = get().playerId
      const me = room.players.find((p) => p.id === pid)
      set({
        room,
        wordChoices: me?.isDrawer && room.phase === 'choosing' ? room.wordChoices : get().wordChoices,
      })
    }

    const onChatMessage = (msg: ChatMessage) => {
      const r = get().room
      if (r) {
        set({ room: { ...r, messages: [...r.messages, msg].slice(-100) } })
      }
    }

    const onYourTurn = (choices: string[]) => {
      set({ wordChoices: choices })
    }

    const onHint = (hint: string, revealedCount: number) => {
      const r = get().room
      if (r) set({ room: { ...r, wordHint: hint, hintRevealedCount: revealedCount } })
    }

    const onTimer = (timeLeft: number) => {
      const r = get().room
      if (r) set({ room: { ...r, timeLeft } })
    }

    const onWordReveal = (word: string) => {
      const r = get().room
      if (r) set({ room: { ...r, currentWord: word, wordHint: word } })
    }

    const onRoundEnd = (data: { word: string }) => {
      set({ lastRoundEnd: { word: data.word } })
      setTimeout(() => set({ lastRoundEnd: null }), 6000)
    }

    const onGuessed = (data: { playerId: string; word: string }) => {
      set({ lastCorrectGuess: data })
      setTimeout(() => set({ lastCorrectGuess: null }), 3000)
    }

    const onReaction = (reaction: Reaction) => {
      set({ lastReaction: reaction })
    }

    const onSettingsUpdated = (settings: RoomSettings) => {
      const r = get().room
      if (r) set({ room: { ...r, settings, totalRounds: settings.rounds, drawTime: settings.drawTime } })
    }

    const onError = (message: string) => {
      set({ error: message })
      setTimeout(() => set({ error: null }), 4000)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('room:state', onRoomState)
    socket.on('chat:message', onChatMessage)
    socket.on('game:your-turn', onYourTurn)
    socket.on('game:hint', onHint)
    socket.on('game:timer', onTimer)
    socket.on('game:word-reveal', onWordReveal)
    socket.on('game:round-end', onRoundEnd)
    socket.on('game:guessed', onGuessed)
    socket.on('reaction:new', onReaction)
    socket.on('settings:updated', onSettingsUpdated)
    socket.on('error', onError)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('room:state', onRoomState)
      socket.off('chat:message', onChatMessage)
      socket.off('game:your-turn', onYourTurn)
      socket.off('game:hint', onHint)
      socket.off('game:timer', onTimer)
      socket.off('game:word-reveal', onWordReveal)
      socket.off('game:round-end', onRoundEnd)
      socket.off('game:guessed', onGuessed)
      socket.off('reaction:new', onReaction)
      socket.off('settings:updated', onSettingsUpdated)
      socket.off('error', onError)
    }
  },

  createRoom: async () => {
    const socket = getSocket()
    const { playerName, playerAvatar, playerColor } = get()
    if (!playerName.trim()) {
      set({ error: 'Please enter a name' })
      return false
    }
    return new Promise((resolve) => {
      socket.emit('room:create', { name: playerName, avatar: playerAvatar, color: playerColor }, (res) => {
        if (res.ok && res.room && res.playerId) {
          set({ room: res.room, playerId: res.playerId, view: 'room', wordChoices: res.room.wordChoices })
          resolve(true)
        } else {
          set({ error: res.error || 'Failed to create room' })
          resolve(false)
        }
      })
    })
  },

  joinRoom: async (code: string) => {
    const socket = getSocket()
    const { playerName, playerAvatar, playerColor } = get()
    if (!playerName.trim()) {
      set({ error: 'Please enter a name' })
      return false
    }
    if (!code.trim()) {
      set({ error: 'Please enter a room code' })
      return false
    }
    return new Promise((resolve) => {
      socket.emit('room:join', { code: code.toUpperCase(), name: playerName, avatar: playerAvatar, color: playerColor }, (res) => {
        if (res.ok && res.room && res.playerId) {
          set({ room: res.room, playerId: res.playerId, view: 'room' })
          resolve(true)
        } else {
          set({ error: res.error || 'Failed to join room' })
          resolve(false)
        }
      })
    })
  },

  leaveRoom: () => {
    const socket = getSocket()
    socket.emit('room:leave')
    set({ room: null, playerId: null, view: 'landing', wordChoices: [] })
  },

  startGame: () => {
    const socket = getSocket()
    socket.emit('game:start')
  },

  chooseWord: (word: string) => {
    const socket = getSocket()
    socket.emit('game:choose-word', word)
    set({ wordChoices: [] })
  },

  sendChat: (content: string) => {
    const socket = getSocket()
    socket.emit('chat:send', content)
  },

  sendStroke: (stroke: DrawStroke) => {
    const socket = getSocket()
    socket.emit('draw:stroke', stroke)
  },

  clearCanvas: () => {
    const socket = getSocket()
    socket.emit('draw:clear')
  },

  undoStroke: () => {
    const socket = getSocket()
    socket.emit('draw:undo')
  },

  sendReaction: (emoji: string) => {
    const socket = getSocket()
    socket.emit('reaction:send', emoji)
  },

  updateSettings: (settings: Partial<RoomSettings>) => {
    const socket = getSocket()
    socket.emit('settings:update', settings)
  },

  setPlayerInfo: (name: string, avatar: string, color: string) => {
    set({ playerName: name, playerAvatar: avatar, playerColor: color })
  },

  clearError: () => set({ error: null }),
}))
