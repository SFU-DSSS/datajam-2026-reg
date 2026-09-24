import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { RetroMusicPlayer } from "@/components/retro-music-player"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "HackML 2026 - Team Registration Portal",
  description: "Register your team for HackML 2026, a 12-hour machine learning competition hosted by DSSS at SFU",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {/* Pixelated layered background */}
        <div className="pixel-stars" />
        <div className="synthwave-grid">
          <div className="grid-lines" id="gridLines" />
        </div>
        <div className="particles" id="particles" />
        {children}
        <RetroMusicPlayer />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
