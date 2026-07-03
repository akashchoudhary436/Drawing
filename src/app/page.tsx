'use client'

import { useEffect } from 'react'
import { useGame } from '@/hooks/use-game'
import { LandingView } from '@/components/game/landing-view'
import { GameRoomView } from '@/components/game/game-room-view'
import { Toaster } from '@/components/ui/toaster'

export default function Home() {
  const { view, init } = useGame()

  useEffect(() => {
    const cleanup = init()
    return cleanup
  }, [init])

  return (
    <>
      {view === 'landing' && <LandingView />}
      {view === 'room' && <GameRoomView />}
      <Toaster />
    </>
  )
}
