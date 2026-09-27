import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Unbounded } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { RetroMusicPlayer } from "@/components/retro-music-player"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-unbounded" })

export const metadata: Metadata = {
  title: "DataJam 2026 - Registration Portal",
  description: "Register for DataJam 2026, SFU's annual data science case competition hosted by DSSS",
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
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${unbounded.variable}`}>
      <body className="antialiased">
        {children}
        <RetroMusicPlayer />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
