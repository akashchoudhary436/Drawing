import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://doodleduel.app"),
  title: {
    default: "Doodle Duel — Free Online Multiplayer Drawing & Guessing Game",
    template: "%s · Doodle Duel",
  },
  description:
    "Play Doodle Duel, a free online multiplayer drawing and guessing game like Skribbl. Take turns drawing words while friends race to guess in real time. No download, play instantly in your browser on any device.",
  keywords: [
    "skribbl",
    "skribble",
    "skribbl.io",
    "drawing game",
    "drawing games",
    "online drawing game",
    "multiplayer drawing game",
    "guessing game",
    "pictionary online",
    "free drawing game",
    "party game",
    "doodle game",
    "draw and guess",
    "browser drawing game",
    "real-time multiplayer game",
  ],
  authors: [{ name: "Doodle Duel" }],
  applicationName: "Doodle Duel",
  category: "Games",
  creator: "Doodle Duel",
  publisher: "Doodle Duel",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Doodle Duel — Free Online Multiplayer Drawing & Guessing Game",
    description:
      "Draw it. Guess it. Win it together. A free real-time multiplayer drawing party game like Skribbl. Play with friends on any device — no download needed.",
    siteName: "Doodle Duel",
    type: "website",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Doodle Duel — Free Online Drawing & Guessing Game",
    description: "Play a free multiplayer drawing & guessing party game like Skribbl. Draw, guess, and win with friends in real time.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Doodle Duel",
  applicationCategory: "GameApplication",
  applicationSubCategory: "Drawing & Guessing Game",
  operatingSystem: "Web Browser",
  url: "https://doodleduel.app/",
  description:
    "Free online multiplayer drawing and guessing game. Take turns drawing words while friends race to guess in real time. Play like Skribbl in your browser — no download needed.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  genre: ["Party Game", "Drawing Game", "Multiplayer Game"],
  numberOfPlayers: { "@type": "QuantitativeValue", minValue: 2, maxValue: 12 },
  featureList: [
    "Real-time multiplayer drawing",
    "Guess the word chat system",
    "7 drawing tools and 30+ colors",
    "8 word categories",
    "Progressive hints",
    "Up to 12 players per room",
    "Mobile and desktop support",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1200",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
