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
  title: "Doodle Duel — Multiplayer Drawing & Guessing Game",
  description: "A vibrant real-time multiplayer drawing & guessing party game. Sketch, guess, and win with friends on any device.",
  keywords: ["drawing game", "skribbl", "multiplayer", "party game", "guessing game", "doodle"],
  authors: [{ name: "Doodle Duel" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Doodle Duel — Multiplayer Drawing Game",
    description: "Draw it. Guess it. Win it together. Real-time multiplayer drawing party game.",
    siteName: "Doodle Duel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Doodle Duel",
    description: "Multiplayer drawing & guessing party game",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
