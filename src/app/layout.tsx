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
  metadataBase: new URL("https://doodle-duel-ufjv.onrender.com"),
  verification: { google: "google80cc35fa307ef1e3" },
  title: {
    default: "Doodle Duel - Free Multiplayer Drawing & Guessing Game | Play Online",
    template: "%s · Doodle Duel",
  },
  description:
    "Play Doodle Duel, a free online multiplayer drawing and guessing game inspired by classic party drawing games. Create private rooms, challenge friends, draw, guess, and compete in real time.",
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
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [
      { url: "/favicon.svg", sizes: "any" },
    ],
  },
  manifest: "/site.webmanifest",
  themeColor: "#f59e0b",
  openGraph: {
    title: "Doodle Duel - Free Multiplayer Drawing & Guessing Game",
    description:
      "Play Doodle Duel, a free online multiplayer drawing and guessing game. Create private rooms, challenge friends, draw, guess, and compete in real time.",
    siteName: "Doodle Duel",
    type: "website",
    url: "https://doodle-duel-ufjv.onrender.com/",
    locale: "en_US",
    images: [
      {
        url: "/game-playing-screenshot.png",
        width: 1200,
        height: 630,
        alt: "Doodle Duel multiplayer drawing game screenshot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Doodle Duel - Free Multiplayer Drawing & Guessing Game",
    description: "Play Doodle Duel, a free online multiplayer drawing and guessing game. Draw, guess, and compete with friends in real time.",
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
  "@type": "VideoGame",
  name: "Doodle Duel",
  description:
    "Free online multiplayer drawing and guessing game. Take turns drawing words while friends race to guess in real time. Play like Skribbl in your browser — no download needed.",
  genre: ["Party Game", "Drawing Game", "Multiplayer Game"],
  playMode: "MultiPlayer",
  applicationCategory: "Game",
  operatingSystem: "Web Browser",
  url: "https://doodle-duel-ufjv.onrender.com/",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
