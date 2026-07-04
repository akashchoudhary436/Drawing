import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, Room, Player, ChatMessage, DrawStroke, RoomSettings, Reaction } from '../../src/lib/game-types.ts'
import { WORD_CATEGORIES, ALL_WORDS, getWordsForSettings, pickRandomWords } from '../../src/lib/words.ts'

const httpServer = createServer()
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// --- Request logging & health endpoints (lightweight, no game state access) ---
function requestLogger(req: IncomingMessage, res: ServerResponse): void {
  const start = Date.now()
  res.once('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`)
  })
}

function handleHealth(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Doodle Duel Backend',
      uptime: process.uptime(),
      timestamp: Date.now(),
    }))
    return true
  }
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Doodle Duel Backend Running')
    return true
  }
  return false
}

// Prepend health handler before Socket.IO's listener to intercept health endpoints
const socketListeners = httpServer.listeners('request') as Array<(req: IncomingMessage, res: ServerResponse) => void>
httpServer.removeAllListeners('request')
httpServer.on('request', (req: IncomingMessage, res: ServerResponse) => {
  requestLogger(req, res)
  if (handleHealth(req, res)) return
  for (const listener of socketListeners) {
    listener(req, res)
  }
})
// ---

// ---------- In-memory state ----------
const rooms = new Map<string, Room>()
const playerRoomMap = new Map<string, string>() // socketId -> roomCode

const AVATAR_POOL = ['🦊', '🐼', '🐸', '🦁', '🐯', '🦄', '🐙', '🦉', '🐶', '🐱', '🐰', '🐺']
const COLOR_POOL = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#B5EAD7', '#C7CEEA', '#FFDAC1']

const DEFAULT_SETTINGS: RoomSettings = {
  rounds: 3,
  drawTime: 80,
  wordMode: 'all',
  hintsEnabled: true,
}

function genRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  do {
    code = ''
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  } while (rooms.has(code))
  return code
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function maskWord(word: string, revealed: number): string {
  // Reveal `revealed` random letters; underscores for the rest. Spaces shown as-is.
  const chars = word.split('')
  const letterIndexes = chars
    .map((c, i) => (c !== ' ' && c !== '-' ? i : -1))
    .filter((i) => i >= 0)
  const shuffled = [...letterIndexes].sort(() => Math.random() - 0.5)
  const revealSet = new Set(shuffled.slice(0, revealed))
  return chars
    .map((c, i) => {
      if (c === ' ' || c === '-') return c
      return revealSet.has(i) ? c : '_'
    })
    .join(' ')
}

function createPlayer(socketId: string, name: string, avatar: string, color: string, isHost: boolean): Player {
  return {
    id: socketId,
    name: name.slice(0, 18) || 'Player',
    avatar: avatar || AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)],
    color: color || COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)],
    score: 0,
    guessedThisRound: false,
    isHost,
    isDrawer: false,
    connected: true,
  }
}

function createRoom(host: Player, settings: RoomSettings, isPublic = false): Room {
  return {
    code: genRoomCode(),
    players: [host],
    hostId: host.id,
    phase: 'waiting',
    currentRound: 0,
    totalRounds: settings.rounds,
    drawTime: settings.drawTime,
    timeLeft: 0,
    currentDrawerId: null,
    currentWord: null,
    wordChoices: [],
    wordHint: '',
    hintRevealedCount: 0,
    drawerQueue: [],
    messages: [
      {
        id: genId(),
        playerId: 'system',
        playerName: 'System',
        avatar: '🎯',
        content: `Room created! Share code ${''} with friends to invite them.`,
        type: 'system',
        timestamp: Date.now(),
      },
    ],
    reactions: [],
    settings,
    lastWord: null,
    lastWinner: null,
    roundCorrectCount: 0,
    isPublic,
  }
}

function systemMsg(content: string): ChatMessage {
  return {
    id: genId(),
    playerId: 'system',
    playerName: 'System',
    avatar: '🎯',
    content,
    type: 'system',
    timestamp: Date.now(),
  }
}

function broadcastRoomState(room: Room) {
  io.to(room.code).emit('room:state', room)
}

// Find an open public room a random player can join.
// Criteria: public, in 'waiting' phase, has >=1 connected player, not full, at least one player
// who is not currently mid-choose (the host should be idling in lobby).
function findRandomRoom(): Room | null {
  const candidates: Room[] = []
  for (const room of rooms.values()) {
    if (!room.isPublic) continue
    if (room.phase !== 'waiting') continue
    const connected = room.players.filter((p) => p.connected)
    if (connected.length === 0) continue
    if (connected.length >= 12) continue
    candidates.push(room)
  }
  if (candidates.length === 0) return null
  // Prefer rooms with more players (so random joiners group together), tie-break by oldest
  candidates.sort((a, b) => {
    const ca = a.players.filter((p) => p.connected).length
    const cb = b.players.filter((p) => p.connected).length
    return cb - ca
  })
  return candidates[0]
}

function getWordPool(room: Room): string[] {
  return getWordsForSettings(room.settings)
}

// Timer references per room
const timers = new Map<string, { interval: NodeJS.Timeout; hintTimer: NodeJS.Timeout | null }>()

function clearTimers(code: string) {
  const t = timers.get(code)
  if (t) {
    clearInterval(t.interval)
    if (t.hintTimer) clearTimeout(t.hintTimer)
    timers.delete(code)
  }
}

function startRound(room: Room) {
  // Pick next drawer from queue
  if (room.drawerQueue.length === 0) {
    // build queue from connected players
    room.drawerQueue = room.players.filter((p) => p.connected).map((p) => p.id)
    room.currentRound += 1
    if (room.currentRound > room.totalRounds) {
      endGame(room)
      return
    }
  }

  const drawerId = room.drawerQueue.shift()!
  const drawer = room.players.find((p) => p.id === drawerId)
  if (!drawer || !drawer.connected) {
    // skip disconnected, try next
    startRound(room)
    return
  }

  room.currentDrawerId = drawerId
  room.currentWord = null
  room.wordHint = ''
  room.hintRevealedCount = 0
  room.roundCorrectCount = 0
  room.timeLeft = 0
  room.phase = 'choosing'

  // reset guessed flags
  room.players.forEach((p) => {
    p.guessedThisRound = false
    p.isDrawer = p.id === drawerId
  })

  // pick 3 words
  const pool = getWordPool(room)
  room.wordChoices = pickRandomWords(pool, 3)

  // system message
  room.messages.push(systemMsg(`Round ${room.currentRound} — ${drawer.name} ${drawer.avatar} is choosing a word!`))

  broadcastRoomState(room)

  // notify drawer privately
  io.to(drawerId).emit('game:your-turn', room.wordChoices)

  // Auto-pick after 15s if no choice
  const chooseTimeout = setTimeout(() => {
    const r = rooms.get(room.code)
    if (r && r.phase === 'choosing' && r.currentDrawerId === drawerId) {
      const word = r.wordChoices[Math.floor(Math.random() * r.wordChoices.length)]
      beginDrawing(r, word)
    }
  }, 15000)

  // store as hint timer slot temporarily
  const t = timers.get(room.code)
  if (t) {
    t.hintTimer = chooseTimeout as unknown as NodeJS.Timeout
  } else {
    timers.set(room.code, { interval: setInterval(() => {}, 999999), hintTimer: chooseTimeout as unknown as NodeJS.Timeout })
  }
}

function beginDrawing(room: Room, word: string) {
  room.currentWord = word
  room.phase = 'drawing'
  room.timeLeft = room.drawTime
  room.hintRevealedCount = 0
  room.wordHint = maskWord(word, 0)

  room.messages.push(systemMsg(`${room.players.find((p) => p.id === room.currentDrawerId)?.name} is drawing! Start guessing! 🎨`))

  broadcastRoomState(room)

  clearTimers(room.code)

  const startTime = Date.now()
  const totalMs = room.drawTime * 1000
  const interval = setInterval(() => {
    const r = rooms.get(room.code)
    if (!r || r.phase !== 'drawing') {
      clearTimers(room.code)
      return
    }
    const elapsed = Date.now() - startTime
    const left = Math.max(0, Math.ceil((totalMs - elapsed) / 1000))
    r.timeLeft = left
    io.to(r.code).emit('game:timer', left)

    // Reveal hints progressively if enabled
    if (r.settings.hintsEnabled) {
      const wordLen = (r.currentWord || '').replace(/[\s-]/g, '').length
      const maxHints = Math.max(1, Math.floor(wordLen / 3))
      const elapsedRatio = elapsed / totalMs
      const targetRevealed = Math.min(maxHints, Math.floor(elapsedRatio * 3 * maxHints))
      if (targetRevealed > r.hintRevealedCount) {
        r.hintRevealedCount = targetRevealed
        r.wordHint = maskWord(r.currentWord!, targetRevealed)
        io.to(r.code).emit('game:hint', r.wordHint, targetRevealed)
      }
    }

    if (left <= 0) {
      endRound(r)
    }
  }, 1000)

  timers.set(room.code, { interval, hintTimer: null })
}

function endRound(room: Room) {
  clearTimers(room.code)
  room.phase = 'round-end'
  room.timeLeft = 0

  const word = room.currentWord || '—'
  room.lastWord = word
  room.messages.push(systemMsg(`Round over! The word was "${word}" 🎯`))

  io.to(room.code).emit('game:word-reveal', word)
  io.to(room.code).emit('game:round-end', {
    word,
    scores: room.players.map((p) => ({ playerId: p.id, gained: 0 })),
  })

  broadcastRoomState(room)

  // Next round after 6 seconds
  setTimeout(() => {
    const r = rooms.get(room.code)
    if (r && (r.phase === 'round-end' || r.phase === 'drawing')) {
      // clear canvas via system clear
      r.players.forEach((p) => {}) // no-op
      io.to(r.code).emit('draw:clear', 'system')
      startRound(r)
    }
  }, 6000)
}

function endGame(room: Room) {
  clearTimers(room.code)
  room.phase = 'game-end'
  room.currentDrawerId = null
  room.currentWord = null
  room.players.forEach((p) => (p.isDrawer = false))
  const winner = [...room.players].sort((a, b) => b.score - a.score)[0]
  room.lastWinner = winner?.id || null
  room.messages.push(systemMsg(`🏆 Game over! Winner: ${winner?.name} ${winner?.avatar} with ${winner?.score} points!`))
  broadcastRoomState(room)
}

function checkAllGuessed(room: Room): boolean {
  const guessers = room.players.filter((p) => p.connected && p.id !== room.currentDrawerId)
  if (guessers.length === 0) return false
  return guessers.every((p) => p.guessedThisRound)
}

function handleGuess(room: Room, player: Player, content: string) {
  if (room.phase !== 'drawing' || !room.currentWord) return
  if (player.id === room.currentDrawerId) return // drawer can't guess
  if (player.guessedThisRound) return

  const guess = content.trim().toLowerCase()
  const word = room.currentWord.toLowerCase()

  if (guess === word) {
    player.guessedThisRound = true
    room.roundCorrectCount += 1

    // Score: based on time left and order of guessing
    const orderBonus = Math.max(0, 100 - (room.roundCorrectCount - 1) * 20)
    const timeBonus = Math.round((room.timeLeft / room.drawTime) * 100)
    const gained = 50 + orderBonus + timeBonus
    player.score += gained

    // Drawer also gets points for each correct guess
    const drawer = room.players.find((p) => p.id === room.currentDrawerId)
    if (drawer) {
      drawer.score += 40
    }

    room.messages.push({
      id: genId(),
      playerId: player.id,
      playerName: player.name,
      avatar: player.avatar,
      content: `guessed the word! (+${gained})`,
      type: 'correct',
      timestamp: Date.now(),
    })

    io.to(room.code).emit('game:guessed', { playerId: player.id, word: room.currentWord })
    broadcastRoomState(room)

    if (checkAllGuessed(room)) {
      endRound(room)
    }
    return
  }

  // Close guess detection (Levenshtein-ish via simple includes)
  const closeThreshold = 2
  if (Math.abs(guess.length - word.length) <= closeThreshold) {
    let diff = 0
    const maxLen = Math.max(guess.length, word.length)
    for (let i = 0; i < maxLen; i++) {
      if (guess[i] !== word[i]) diff++
    }
    if (diff <= closeThreshold && diff > 0) {
      room.messages.push({
        id: genId(),
        playerId: player.id,
        playerName: player.name,
        avatar: player.avatar,
        content,
        type: 'close',
        timestamp: Date.now(),
      })
      io.to(room.code).emit('chat:message', room.messages[room.messages.length - 1])
      return
    }
  }

  // Normal chat message
  const msg: ChatMessage = {
    id: genId(),
    playerId: player.id,
    playerName: player.name,
    avatar: player.avatar,
    content: content.slice(0, 200),
    type: 'chat',
    timestamp: Date.now(),
  }
  room.messages.push(msg)
  io.to(room.code).emit('chat:message', msg)
}

// ---------- Socket handlers ----------
io.on('connection', (socket) => {
  console.log(`[connected] ${socket.id}`)

  socket.on('room:create', (data, ack) => {
    const player = createPlayer(socket.id, data.name, data.avatar, data.color, true)
    const room = createRoom(player, { ...DEFAULT_SETTINGS }, false)
    room.messages[0].content = `Room created! Share code ${room.code} with friends to invite them.`
    rooms.set(room.code, room)
    playerRoomMap.set(socket.id, room.code)
    socket.join(room.code)
    ack({ ok: true, room, playerId: player.id })
    console.log(`[room:create] ${player.name} created ${room.code}`)
  })

  socket.on('room:join', (data, ack) => {
    const room = rooms.get(data.code.toUpperCase())
    if (!room) {
      ack({ ok: false, error: 'Room not found' })
      return
    }
    if (room.players.filter((p) => p.connected).length >= 12) {
      ack({ ok: false, error: 'Room is full' })
      return
    }
    // If game in progress, allow join as spectator/waiting
    const player = createPlayer(socket.id, data.name, data.avatar, data.color, false)
    room.players.push(player)
    playerRoomMap.set(socket.id, room.code)
    socket.join(room.code)

    room.messages.push(systemMsg(`${player.name} ${player.avatar} joined the room!`))
    broadcastRoomState(room)
    ack({ ok: true, room, playerId: player.id })
    console.log(`[room:join] ${player.name} joined ${room.code}`)
  })

  socket.on('room:join-random', (data, ack) => {
    // Try to find an existing open public room
    let room = findRandomRoom()
    if (!room) {
      // No open room — create a new public one and become its host
      const player = createPlayer(socket.id, data.name, data.avatar, data.color, true)
      room = createRoom(player, { ...DEFAULT_SETTINGS }, true)
      room.messages[0].content = `🌐 Global lobby created! Share code ${room.code} or wait for others to join.`
      rooms.set(room.code, room)
      playerRoomMap.set(socket.id, room.code)
      socket.join(room.code)
      ack({ ok: true, room, playerId: player.id })
      console.log(`[room:join-random] ${player.name} created public ${room.code}`)
      return
    }
    // Join the existing public room
    const player = createPlayer(socket.id, data.name, data.avatar, data.color, false)
    room.players.push(player)
    playerRoomMap.set(socket.id, room.code)
    socket.join(room.code)
    room.messages.push(systemMsg(`${player.name} ${player.avatar} joined from the global lobby!`))
    broadcastRoomState(room)
    ack({ ok: true, room, playerId: player.id })
    console.log(`[room:join-random] ${player.name} joined public ${room.code}`)
  })

  socket.on('room:reconnect', (data, ack) => {
    const room = rooms.get(data.code.toUpperCase())
    if (!room) {
      ack({ ok: false, error: 'Room not found' })
      return
    }
    const player = room.players.find((p) => p.id === data.playerId)
    if (!player) {
      ack({ ok: false, error: 'Player not found' })
      return
    }
    // re-attach socket id
    const oldId = player.id
    player.id = socket.id
    player.connected = true
    if (room.hostId === oldId) room.hostId = socket.id
    if (room.currentDrawerId === oldId) room.currentDrawerId = socket.id
    room.drawerQueue = room.drawerQueue.map((id) => (id === oldId ? socket.id : id))
    playerRoomMap.set(socket.id, room.code)
    socket.join(room.code)
    broadcastRoomState(room)
    ack({ ok: true, room })
  })

  socket.on('game:start', () => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.hostId !== socket.id) return
    if (room.players.filter((p) => p.connected).length < 2) {
      socket.emit('error', 'Need at least 2 players to start!')
      return
    }
    if (room.phase !== 'waiting' && room.phase !== 'game-end') return
    // reset scores
    room.players.forEach((p) => {
      p.score = 0
      p.guessedThisRound = false
      p.isDrawer = false
    })
    room.currentRound = 0
    room.drawerQueue = []
    room.phase = 'waiting'
    room.totalRounds = room.settings.rounds
    room.drawTime = room.settings.drawTime
    room.messages.push(systemMsg('Game starting! 🚀'))
    broadcastRoomState(room)
    startRound(room)
  })

  socket.on('game:choose-word', (word) => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'choosing' || room.currentDrawerId !== socket.id) return
    if (!room.wordChoices.includes(word)) return
    beginDrawing(room, word)
  })

  socket.on('chat:send', (content) => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room) return
    const player = room.players.find((p) => p.id === socket.id)
    if (!player) return
    const trimmed = content.trim()
    if (!trimmed) return

    if (room.phase === 'drawing') {
      handleGuess(room, player, trimmed)
    } else {
      const msg: ChatMessage = {
        id: genId(),
        playerId: player.id,
        playerName: player.name,
        avatar: player.avatar,
        content: trimmed.slice(0, 200),
        type: 'chat',
        timestamp: Date.now(),
      }
      room.messages.push(msg)
      io.to(room.code).emit('chat:message', msg)
    }
  })

  socket.on('draw:stroke-start', (stroke) => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'drawing' || room.currentDrawerId !== socket.id) return
    socket.to(room.code).emit('draw:stroke-start', stroke, socket.id)
  })

  socket.on('draw:stroke-point', (point) => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'drawing' || room.currentDrawerId !== socket.id) return
    socket.to(room.code).emit('draw:stroke-point', point, socket.id)
  })

  socket.on('draw:stroke-end', (strokeId) => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'drawing' || room.currentDrawerId !== socket.id) return
    socket.to(room.code).emit('draw:stroke-end', strokeId, socket.id)
  })

  socket.on('draw:clear', () => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'drawing' || room.currentDrawerId !== socket.id) return
    io.to(room.code).emit('draw:clear', socket.id)
  })

  socket.on('draw:undo', () => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.phase !== 'drawing' || room.currentDrawerId !== socket.id) return
    io.to(room.code).emit('draw:undo', socket.id)
  })

  socket.on('reaction:send', (emoji) => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room) return
    const player = room.players.find((p) => p.id === socket.id)
    if (!player) return
    const reaction: Reaction = {
      id: genId(),
      emoji: emoji.slice(0, 8),
      playerId: player.id,
      playerName: player.name,
      x: Math.random(),
      timestamp: Date.now(),
    }
    io.to(room.code).emit('reaction:new', reaction)
  })

  socket.on('settings:update', (settings) => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.hostId !== socket.id) return
    if (room.phase !== 'waiting' && room.phase !== 'game-end') return
    room.settings = { ...room.settings, ...settings }
    room.totalRounds = room.settings.rounds
    room.drawTime = room.settings.drawTime
    broadcastRoomState(room)
    io.to(room.code).emit('settings:updated', room.settings)
  })

  socket.on('game:kick', (playerId) => {
    const code = playerRoomMap.get(socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.hostId !== socket.id) return
    const target = room.players.find((p) => p.id === playerId)
    if (!target || target.isHost) return
    target.connected = false
    room.messages.push(systemMsg(`${target.name} was kicked from the room.`))
    io.sockets.sockets.get(playerId)?.leave(room.code)
    io.to(playerId).emit('error', 'You were kicked from the room.')
    room.players = room.players.filter((p) => p.id !== playerId)
    playerRoomMap.delete(playerId)
    broadcastRoomState(room)
  })

  socket.on('room:leave', () => {
    handleDisconnect(socket.id)
  })

  socket.on('disconnect', () => {
    handleDisconnect(socket.id)
  })

  socket.on('error', (err) => {
    console.error(`[socket error] ${socket.id}:`, err)
  })
})

function handleDisconnect(socketId: string) {
  const code = playerRoomMap.get(socketId)
  if (!code) return
  const room = rooms.get(code)
  if (!room) {
    playerRoomMap.delete(socketId)
    return
  }
  const player = room.players.find((p) => p.id === socketId)
  if (!player) {
    playerRoomMap.delete(socketId)
    return
  }
  player.connected = false
  playerRoomMap.delete(socketId)

  room.messages.push(systemMsg(`${player.name} ${player.avatar} disconnected.`))

  // If drawer disconnects during drawing, end the round
  if (room.phase === 'drawing' && room.currentDrawerId === socketId) {
    room.messages.push(systemMsg('Drawer left — ending round early.'))
    endRound(room)
  } else if (room.phase === 'choosing' && room.currentDrawerId === socketId) {
    // skip to next
    startRound(room)
  }

  // Wait 30s before removing player (allow reconnection)
  setTimeout(() => {
    const r = rooms.get(code)
    if (!r) return
    const p = r.players.find((pp) => pp.id === socketId)
    if (p && !p.connected) {
      r.players = r.players.filter((pp) => pp.id !== socketId)
      r.drawerQueue = r.drawerQueue.filter((id) => id !== socketId)
      // if host left, assign new host
      if (r.hostId === socketId && r.players.length > 0) {
        r.players[0].isHost = true
        r.hostId = r.players[0].id
        r.messages.push(systemMsg(`${r.players[0].name} is now the host.`))
      }
      // if no players left, delete room
      if (r.players.length === 0) {
        clearTimers(code)
        rooms.delete(code)
        return
      }
      broadcastRoomState(r)
    }
  }, 30000)

  broadcastRoomState(room)
}

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`🎨 Doodle Duel game service running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...')
  httpServer.close(() => process.exit(0))
})
