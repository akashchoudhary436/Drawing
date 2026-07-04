'use client'

import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from './game-types'

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

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

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const url = getSocketUrl()
    socket = io(url, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}
