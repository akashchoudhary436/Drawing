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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
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
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://doodle-duel-ufjv.onrender.com/#website",
      name: "Doodle Duel",
      url: "https://doodle-duel-ufjv.onrender.com/",
      description:
        "Free online multiplayer drawing and guessing game. Take turns drawing words while friends race to guess in real time.",
      publisher: { "@id": "https://doodle-duel-ufjv.onrender.com/#organization" },
    },
    {
      "@type": "Organization",
      "@id": "https://doodle-duel-ufjv.onrender.com/#organization",
      name: "Doodle Duel",
      url: "https://doodle-duel-ufjv.onrender.com/",
      logo: "https://doodle-duel-ufjv.onrender.com/favicon.svg",
    },
    {
      "@type": "VideoGame",
      "@id": "https://doodle-duel-ufjv.onrender.com/#game",
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
    },
    {
      "@type": "FAQPage",
      "@id": "https://doodle-duel-ufjv.onrender.com/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is Doodle Duel free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Doodle Duel is completely free to play. No download or sign-up required.",
          },
        },
        {
          "@type": "Question",
          name: "Can I play Doodle Duel with friends?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, you can create a private room and share the 5-character room code with your friends so they can join directly.",
          },
        },
        {
          "@type": "Question",
          name: "How many players can play Doodle Duel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Doodle Duel supports up to 12 players per room. You can play with as few as 2 players.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need to download anything to play Doodle Duel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No download needed. Doodle Duel runs entirely in your web browser on any device — desktop, tablet, or phone.",
          },
        },
        {
          "@type": "Question",
          name: "What drawing tools does Doodle Duel have?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Doodle Duel has 7 drawing tools: pen, brush, eraser, fill, line, rectangle, and circle, plus 30 colors and 5 brush sizes.",
          },
        },
        {
          "@type": "Question",
          name: "Is Doodle Duel like Skribbl?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Doodle Duel is a free online multiplayer drawing and guessing game similar to Skribbl. One player draws a secret word while others guess in real-time chat.",
          },
        },
      ],
    },
  ],
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
