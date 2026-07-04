'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Zap, Trophy, Users, Palette, Swords, Gamepad2, ArrowRight, Copy, Globe, Shuffle } from 'lucide-react'
import { AVATARS, AVATAR_COLORS, WORD_CATEGORIES } from '@/lib/words'
import { useGame } from '@/hooks/use-game'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function LandingView() {
  const { playerName, playerAvatar, playerColor, setPlayerInfo, createRoom, joinRoom, joinRandomRoom, connected } = useGame()
  const { toast } = useToast()
  const [joinCode, setJoinCode] = useState('')
  const [rounds, setRounds] = useState(3)
  const [drawTime, setDrawTime] = useState(80)
  const [hints, setHints] = useState(true)
  const [wordMode, setWordMode] = useState<'all' | 'category' | 'custom'>('all')
  const [category, setCategory] = useState('animals')
  const [customWords, setCustomWords] = useState('')
  const [joiningRandom, setJoiningRandom] = useState(false)

  const handleJoinRandom = async () => {
    if (!connected) {
      toast({ title: 'Connecting...', description: 'Still connecting to server', variant: 'destructive' })
      return
    }
    if (!playerName.trim()) {
      toast({ title: 'Enter a name first', description: 'Pick a display name to play', variant: 'destructive' })
      return
    }
    setJoiningRandom(true)
    const ok = await joinRandomRoom()
    setJoiningRandom(false)
    if (ok) {
      toast({ title: '🌐 Joined the global lobby!', description: 'Hang tight — others will join soon' })
    }
  }

  const handleCreate = async () => {
    if (!connected) {
      toast({ title: 'Connecting...', description: 'Still connecting to server', variant: 'destructive' })
      return
    }
    const ok = await createRoom()
    if (ok) {
      // After create, the host can still update settings via the room view (GameRoom handles settings)
      // But we'll stash the chosen settings in localStorage to apply on first entry.
      const settings = {
        rounds,
        drawTime,
        hintsEnabled: hints,
        wordMode,
        category: wordMode === 'category' ? category : undefined,
        customWords: wordMode === 'custom' ? customWords.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      }
      try {
        localStorage.setItem('doodle-initial-settings', JSON.stringify(settings))
      } catch {}
      toast({ title: 'Room created!', description: 'Share the code with friends' })
    }
  }

  const handleJoin = async () => {
    if (!connected) {
      toast({ title: 'Connecting...', description: 'Still connecting to server', variant: 'destructive' })
      return
    }
    const ok = await joinRoom(joinCode)
    if (ok) toast({ title: 'Joined room!', description: `Welcome to ${joinCode.toUpperCase()}` })
  }

  const handleCopyDemo = () => {
    setPlayerName('Player' + Math.floor(Math.random() * 1000))
    toast({ title: 'Random name generated!' })
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-rose-950">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-rose-300/30 dark:bg-rose-700/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-amber-300/30 dark:bg-amber-700/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-emerald-300/30 dark:bg-emerald-700/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/60 dark:bg-slate-950/60 border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 via-amber-500 to-emerald-500 flex items-center justify-center text-white text-lg shadow-md">
              🎨
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Doodle Duel</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Multiplayer Drawing & Guessing</p>
            </div>
          </div>
          <Badge
            variant={connected ? 'default' : 'secondary'}
            className={cn(
              'gap-1.5',
              connected ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-amber-500 hover:bg-amber-500'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', connected ? 'bg-white animate-pulse' : 'bg-white/70')} />
            {connected ? 'Online' : 'Connecting'}
          </Badge>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-10 pb-6 text-center">
        <Badge variant="outline" className="mb-3 gap-1.5 bg-white/50 dark:bg-slate-900/50">
          <Sparkles className="h-3 w-3 text-amber-500" /> Real-time multiplayer · 8 drawing tools
        </Badge>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">
            Draw it. Guess it.
          </span>
          <br />
          <span className="text-foreground">Win it together.</span>
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
          A vibrant, fast, multiplayer drawing party game. Sketch hilarious prompts, race to guess the word,
          earn points, and crown a champion. Play with friends on any device.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
          {[
            { icon: Users, label: 'Up to 12 players' },
            { icon: Palette, label: '7 drawing tools' },
            { icon: Zap, label: 'Real-time sync' },
            { icon: Trophy, label: '8 word categories' },
            { icon: Gamepad2, label: 'Mobile friendly' },
          ].map((f) => (
            <Badge key={f.label} variant="secondary" className="gap-1.5 bg-white/70 dark:bg-slate-900/70">
              <f.icon className="h-3 w-3" /> {f.label}
            </Badge>
          ))}
        </div>

        {/* Quick Play CTA */}
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={handleJoinRandom}
            disabled={!connected || !playerName.trim() || joiningRandom}
            className="gap-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 hover:opacity-90 text-base px-7 h-12 shadow-lg shadow-fuchsia-500/20"
          >
            {joiningRandom ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Finding a lobby...
              </>
            ) : (
              <>
                <Globe className="h-5 w-5" />
                Quick Play — Join Global Lobby
              </>
            )}
          </Button>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Shuffle className="h-3 w-3" />
            Instant matchmaking with online players
          </span>
        </div>
      </section>

      {/* Main setup card */}
      <main className="container mx-auto px-4 pb-16 flex-1">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-6">
          {/* Player setup (left) */}
          <Card className="lg:col-span-2 shadow-lg border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-xl">🎭</span> Your Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="name"
                    value={playerName}
                    onChange={(e) => setPlayerInfo(e.target.value.slice(0, 18), playerAvatar, playerColor)}
                    placeholder="Your name..."
                    maxLength={18}
                  />
                  <Button variant="outline" size="icon" type="button" onClick={handleCopyDemo} title="Generate random name" aria-label="Generate random name">
                     <Swords className="h-4 w-4" />
                   </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Avatar</Label>
                <ScrollArea className="h-24 w-full rounded-md border p-2">
                  <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Select avatar">
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        role="radio"
                        aria-checked={playerAvatar === a}
                        aria-label={`Select ${a} avatar`}
                        onClick={() => setPlayerInfo(playerName, a, playerColor)}
                        className={cn(
                          'h-8 w-8 rounded-md text-lg flex items-center justify-center border transition-all hover:scale-110',
                          playerAvatar === a ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'border-transparent hover:bg-accent'
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-1.5">
                <Label>Avatar Color</Label>
                <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Select avatar color">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={playerColor === c}
                      aria-label={`Select color ${c}`}
                      title={c}
                      onClick={() => setPlayerInfo(playerName, playerAvatar, c)}
                      className={cn(
                        'h-7 w-7 rounded-md border-2 transition-transform hover:scale-110',
                        playerColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-2xl border-2"
                  style={{ borderColor: playerColor, backgroundColor: playerColor + '22' }}
                >
                  {playerAvatar}
                </div>
                <div>
                  <div className="font-semibold">{playerName || 'Your name'}</div>
                  <div className="text-xs text-muted-foreground">This is how others see you</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room actions (right) */}
          <Card className="lg:col-span-3 shadow-lg border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-xl">🚪</span> Start Playing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="create">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Create Room
                  </TabsTrigger>
                  <TabsTrigger value="join" className="gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Join Room
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="create" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Rounds: <span className="font-bold text-primary">{rounds}</span></Label>
                      <Slider value={[rounds]} onValueChange={(v) => setRounds(v[0])} min={1} max={8} step={1} aria-label="Number of rounds" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Draw time: <span className="font-bold text-primary">{drawTime}s</span></Label>
                      <Slider value={[drawTime]} onValueChange={(v) => setDrawTime(v[0])} min={30} max={180} step={10} aria-label="Draw time in seconds" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Word source</Label>
                    <Select value={wordMode} onValueChange={(v: any) => setWordMode(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🌐 All categories (mixed)</SelectItem>
                        <SelectItem value="category">🎯 Specific category</SelectItem>
                        <SelectItem value="custom">✍️ Custom word list</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {wordMode === 'category' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WORD_CATEGORIES.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.emoji} {c.name} ({c.words.length})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {wordMode === 'custom' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Custom words (comma separated, min 3)</Label>
                      <Input
                        value={customWords}
                        onChange={(e) => setCustomWords(e.target.value)}
                        placeholder="cat, dog, banana, rocket..."
                      />
                      <p className="text-xs text-muted-foreground">{customWords.split(',').filter(s => s.trim()).length} words</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">Hints enabled</div>
                      <div className="text-xs text-muted-foreground">Reveal letters as time runs out</div>
                    </div>
                    <Switch checked={hints} onCheckedChange={setHints} />
                  </div>

                  <Button
                    size="lg"
                    className="w-full text-base gap-2 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 hover:opacity-90"
                    onClick={handleCreate}
                    disabled={!connected || !playerName.trim()}
                  >
                    <Sparkles className="h-4 w-4" />
                    Create Room
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TabsContent>

                <TabsContent value="join" className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="code">Room Code</Label>
                    <Input
                      id="code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                      placeholder="ABC23"
                      className="text-2xl font-mono tracking-[0.3em] text-center uppercase"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleJoin()
                      }}
                    />
                  </div>
                  <Button
                    size="lg"
                    className="w-full text-base gap-2"
                    onClick={handleJoin}
                    disabled={!connected || !playerName.trim() || joinCode.length < 4}
                  >
                    <Users className="h-4 w-4" />
                    Join Room
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <div className="text-center text-xs text-muted-foreground">
                    Ask a friend for their 5-character room code.
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* How to play */}
        <div className="max-w-5xl mx-auto mt-8">
          <h3 className="text-center text-sm font-semibold text-muted-foreground mb-3">HOW TO PLAY</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { step: '1', title: 'Take turns drawing', desc: 'Each round one player draws a secret word while everyone else guesses.', icon: '✏️' },
              { step: '2', title: 'Guess fast for points', desc: 'The faster you guess correctly, the more points you earn. Drawer gets points too!', icon: '⚡' },
              { step: '3', title: 'Win the game', desc: 'After all rounds, the player with the most points is crowned the Doodle Champion.', icon: '🏆' },
            ].map((s) => (
              <Card key={s.step} className="border-2 bg-white/70 dark:bg-slate-900/70">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-500 via-amber-500 to-emerald-500 flex items-center justify-center text-white text-lg shrink-0">
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">STEP {s.step}</Badge>
                      {s.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t bg-white/60 dark:bg-slate-950/60 backdrop-blur-md mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          🎨 Doodle Duel · Built with Next.js 16 · Socket.io · Real-time multiplayer · Play on any device
        </div>
      </footer>

      <section
        aria-hidden="true"
        className="sr-only"
      >
        <h2>Free Online Drawing & Guessing Game Like Skribbl</h2>
        <p>
          Doodle Duel is a free online multiplayer drawing and guessing game similar to Skribbl,
          skribbl.io, and skribble. Players take turns drawing a secret word while the rest of the
          room races to guess what it is in real time. It is one of the most fun drawing games and
          guessing games you can play in your browser with friends — no download, no sign-up
          required. If you enjoy Skribbl, Skribble, Pictionary, Gartic Phone, or any other online
          drawing games, you will love Doodle Duel.
        </p>
        <h3>How Doodle Duel Compares to Skribbl</h3>
        <p>
          Like Skribbl.io and Skribble, Doodle Duel is a real-time multiplayer draw-and-guess party
          game. One player draws a word and the others type their guesses in the chat. The faster
          you guess correctly, the more points you earn, and the drawer also gets points for every
          correct guess. After all rounds, the player with the highest score wins.
        </p>
        <h3>Features of Our Drawing Game</h3>
        <ul>
          <li>Real-time multiplayer drawing with up to 12 players per room</li>
          <li>7 drawing tools: pen, brush, eraser, fill, line, rectangle, circle</li>
          <li>30+ colors and 5 brush sizes</li>
          <li>8 word categories: Animals, Food, Objects, Nature, Fantasy, Sports, Movies, Challenge</li>
          <li>Progressive letter hints while the timer counts down</li>
          <li>Emoji reactions and live chat</li>
          <li>Mobile and desktop support — play on any device in the browser</li>
          <li>Quick Play global lobby for instant matchmaking with online players</li>
          <li>Private rooms with shareable 5-character room codes</li>
        </ul>
        <h3>Who Is This Drawing Game For?</h3>
        <p>
          Doodle Duel is perfect for anyone searching for drawing games, guessing games, online
          party games, games like Skribbl, games like Skribble, free multiplayer games, or browser
          games to play with friends. Great for classrooms, virtual hangouts, team building, and
          casual fun.
        </p>
      </section>
    </div>
  )
}
