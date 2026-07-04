import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'How to Play',
  description: 'Learn how to play Doodle Duel — the free online multiplayer drawing and guessing game. Rules, scoring, tips, and more.',
  openGraph: {
    title: 'How to Play — Doodle Duel',
    description: 'Learn the rules, scoring, and tips for Doodle Duel, the free online multiplayer drawing and guessing game.',
  },
}

export default function HowToPlayPage() {
  return (
    <div className="min-h-screen w-full">
      <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-rose-950" />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to game
        </Link>

        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          <span className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">
            How to Play
          </span>
        </h1>
        <p className="text-muted-foreground mb-8">Doodle Duel is a free online multiplayer drawing and guessing party game. One player draws a secret word while the rest race to guess it in real time.</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Game Setup</h2>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              <li>Enter a display name and pick an avatar and color.</li>
              <li>Create a private room or click Quick Play to join the global lobby.</li>
              <li>Share your 5-character room code with friends so they can join.</li>
              <li>The host adjusts settings: number of rounds, draw time, word categories, and hints.</li>
              <li>Once everyone is ready, the host clicks Start to begin.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold">Round Structure</h2>
            <ol className="mt-2 space-y-2 text-muted-foreground list-decimal list-inside">
              <li><strong>Choosing phase:</strong> The designated drawer sees 3 word options and picks one.</li>
              <li><strong>Drawing phase:</strong> The drawer sketches the word on the canvas using 7 tools and 30+ colors. The timer counts down.</li>
              <li><strong>Guessing phase:</strong> Other players type their guesses in the chat. As time passes, letter hints are revealed.</li>
              <li><strong>Round end:</strong> When time runs out or everyone guesses correctly, the word is revealed and scores are tallied.</li>
              <li><strong>Next round:</strong> The next player becomes the drawer. After all rounds, the player with the highest score wins.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-bold">Scoring</h2>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              <li><strong>Guessers</strong> earn 50 base points + order bonus (up to 100) + time bonus (up to 100). The faster you guess, the more you score.</li>
              <li><strong>Drawer</strong> earns 40 points for each player who guesses correctly.</li>
              <li>Points accumulate across rounds. The highest total after all rounds wins.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold">Drawing Tools</h2>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              <li><strong>Pen</strong> — thin, smooth strokes</li>
              <li><strong>Brush</strong> — thick painterly strokes</li>
              <li><strong>Eraser</strong> — erase parts of your drawing</li>
              <li><strong>Fill</strong> — flood fill an enclosed area</li>
              <li><strong>Line</strong> — straight lines</li>
              <li><strong>Rectangle</strong> — filled or outlined rectangles</li>
              <li><strong>Circle</strong> — filled or outlined circles</li>
            </ul>
            <p className="mt-2 text-muted-foreground">Choose from 30 preset colors or pick a custom color. Adjust brush size to 5 different widths.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold">Hints System</h2>
            <p className="mt-2 text-muted-foreground">When hints are enabled, the word is shown as underscores at the start of the round. As the timer runs out, random letters are progressively revealed, making it easier to guess.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold">Tips for Winning</h2>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              <li>Guess quickly — you earn more points for fast correct guesses.</li>
              <li>Draw clearly. Use simple shapes and bold colors that make the word easy to recognize.</li>
              <li>Watch the hints. As letters are revealed, narrow down the possibilities.</li>
              <li>Pay attention to close guesses — they mean you are on the right track.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
