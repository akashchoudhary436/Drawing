'use client'

import { useEffect, lazy, Suspense } from 'react'
import { useGame } from '@/hooks/use-game'
import { LandingView } from '@/components/game/landing-view'

const GameRoomView = lazy(() =>
  import('@/components/game/game-room-view').then((mod) => ({ default: mod.GameRoomView }))
)

function GameRoomFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce">🎨</div>
        <div className="text-sm text-muted-foreground font-medium">Loading game...</div>
      </div>
    </div>
  )
}

export default function Home() {
  const { view, init } = useGame()

  useEffect(() => {
    const cleanup = init()
    return cleanup
  }, [init])

  return (
    <>
      {view === 'landing' && <LandingView />}
      {view === 'room' && (
        <Suspense fallback={<GameRoomFallback />}>
          <GameRoomView />
        </Suspense>
      )}
    </>
  )
}
