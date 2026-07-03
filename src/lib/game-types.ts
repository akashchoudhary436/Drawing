// Shared game types used by both the socket server and the Next.js client.

export type View = 'landing' | 'room'

export type GamePhase =
  | 'waiting' // lobby, waiting for players
  | 'choosing' // drawer is picking a word
  | 'drawing' // active drawing round
  | 'round-end' // round over, showing results
  | 'game-end' // game over, final scores

export type ToolType =
  | 'pen'
  | 'brush'
  | 'eraser'
  | 'fill'
  | 'line'
  | 'rect'
  | 'circle'
  | 'spray'

export interface Player {
  id: string
  name: string
  avatar: string // emoji
  color: string // hex color for avatar bg
  score: number
  guessedThisRound: boolean
  isHost: boolean
  isDrawer: boolean
  connected: boolean
}

export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  avatar: string
  content: string
  type: 'chat' | 'system' | 'correct' | 'close'
  timestamp: number
}

export interface StrokeSegment {
  x: number // normalized 0..1
  y: number // normalized 0..1
}

export interface DrawStroke {
  id: string
  tool: ToolType
  color: string
  size: number
  points: StrokeSegment[]
  fromX?: number
  fromY?: number
  toX?: number
  toY?: number
}

export interface CanvasAction {
  type: 'stroke' | 'clear' | 'undo'
  stroke?: DrawStroke
  playerId: string
}

export interface Reaction {
  id: string
  emoji: string
  playerId: string
  playerName: string
  x: number // 0..1 random x position
  timestamp: number
}

export interface RoomSettings {
  rounds: number
  drawTime: number // seconds
  wordMode: 'all' | 'custom' | 'category'
  category?: string
  customWords?: string[]
  hintsEnabled: boolean
}

export interface Room {
  code: string
  players: Player[]
  hostId: string
  phase: GamePhase
  currentRound: number
  totalRounds: number
  drawTime: number
  timeLeft: number
  currentDrawerId: string | null
  currentWord: string | null
  wordChoices: string[]
  wordHint: string // masked word for non-drawers
  hintRevealedCount: number
  drawerQueue: string[] // player ids in order
  messages: ChatMessage[]
  reactions: Reaction[]
  settings: RoomSettings
  lastWord: string | null
  lastWinner: string | null
  roundCorrectCount: number
}

// ---- Socket event payloads (client -> server) ----
export interface ClientToServerEvents {
  'room:create': (data: { name: string; avatar: string; color: string }, ack: (res: { ok: boolean; room?: Room; playerId?: string; error?: string }) => void) => void
  'room:join': (data: { code: string; name: string; avatar: string; color: string }, ack: (res: { ok: boolean; room?: Room; playerId?: string; error?: string }) => void
  ) => void
  'room:leave': () => void
  'room:reconnect': (data: { code: string; playerId: string }, ack: (res: { ok: boolean; room?: Room; error?: string }) => void) => void
  'game:start': () => void
  'game:choose-word': (word: string) => void
  'chat:send': (content: string) => void
  'draw:stroke': (stroke: DrawStroke) => void
  'draw:clear': () => void
  'draw:undo': () => void
  'reaction:send': (emoji: string) => void
  'settings:update': (settings: Partial<RoomSettings>) => void
  'game:kick': (playerId: string) => void
}

// ---- Socket event payloads (server -> client) ----
export interface ServerToClientEvents {
  'room:state': (room: Room) => void
  'room:player-joined': (player: Player) => void
  'room:player-left': (playerId: string) => void
  'room:player-updated': (player: Player) => void
  'chat:message': (message: ChatMessage) => void
  'draw:stroke': (stroke: DrawStroke, playerId: string) => void
  'draw:clear': (playerId: string) => void
  'draw:undo': (playerId: string) => void
  'game:phase': (phase: GamePhase, data?: { word?: string; choices?: string[]; drawerId?: string; timeLeft?: number }) => void
  'game:timer': (timeLeft: number) => void
  'game:hint': (hint: string, revealedCount: number) => void
  'game:word-reveal': (word: string) => void
  'game:round-end': (data: { word: string; scores: { playerId: string; gained: number }[] }) => void
  'reaction:new': (reaction: Reaction) => void
  'game:turn-start': (data: { drawerId: string; choices: string[] }) => void
  'game:your-turn': (choices: string[]) => void
  'game:guessed': (data: { playerId: string; word: string }) => void
  'settings:updated': (settings: RoomSettings) => void
  'error': (message: string) => void
}
