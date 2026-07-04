'use client'

import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from './game-types'

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

type StateChangeCallback = (state: ConnectionState, attempt?: number) => void

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
let stateListeners: StateChangeCallback[] = []
let currentState: ConnectionState = 'disconnected'
let reconnectAttempt = 0
const MAX_EXPONENTIAL_DELAY = 30000

function emitState(state: ConnectionState, attempt?: number) {
  currentState = state
  for (const cb of stateListeners) {
    try { cb(state, attempt) } catch {}
  }
}

function getSocketUrl(): string {
  if (typeof window === 'undefined') return ''

  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL
  }

  if (window.location.hostname === 'localhost') {
    return '/?XTransformPort=3003'
  }

  return 'https://doodle-duel-game.onrender.com'
}

function getExponentialDelay(attempt: number): number {
  const base = Math.min(1000 * Math.pow(1.5, attempt), MAX_EXPONENTIAL_DELAY)
  const jitter = base * 0.2 * Math.random()
  return base + jitter
}

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const url = getSocketUrl()
    reconnectAttempt = 0
    emitState('connecting')

    socket = io(url, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: MAX_EXPONENTIAL_DELAY,
      timeout: 15000,
    })

    socket.on('connect', () => {
      reconnectAttempt = 0
      emitState('connected')
    })

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        emitState('disconnected')
      } else {
        emitState('reconnecting', reconnectAttempt)
      }
    })

    socket.on('reconnect_attempt', (attempt) => {
      reconnectAttempt = attempt
      emitState('reconnecting', attempt)
    })

    socket.on('reconnect', () => {
      reconnectAttempt = 0
      emitState('connected')
    })

    socket.on('reconnect_failed', () => {
      emitState('disconnected')
    })

    socket.io.on('reconnect_error', () => {
      emitState('reconnecting', reconnectAttempt)
    })

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }
  }
  return socket
}

function handleOnline() {
  if (socket && !socket.connected) {
    emitState('reconnecting', 0)
    socket.connect()
  }
}

function handleOffline() {
  emitState('reconnecting', 0)
}

export function onConnectionStateChange(callback: StateChangeCallback): () => void {
  stateListeners.push(callback)
  return () => {
    stateListeners = stateListeners.filter((cb) => cb !== callback)
  }
}

export function getConnectionState(): ConnectionState {
  return currentState
}

export function disconnectSocket() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  stateListeners = []
  reconnectAttempt = 0
  emitState('disconnected')
}
