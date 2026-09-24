"use client"

import { useState, useRef, useEffect } from "react"
import { Music, VolumeX } from "lucide-react"

export function RetroMusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentSource, setCurrentSource] = useState(0)

  const musicSources = [
    "/retro-music.mp3",
    "https://archive.org/download/RetroWaveSynthwave/RetroWave%20-%20Synthwave.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  ]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleError = () => {
      console.log("Switched music source to", musicSources[currentSource + 1])
      if (currentSource < musicSources.length - 1) {
        setCurrentSource(currentSource + 1)
      }
    }

    audio.addEventListener("error", handleError)
    return () => audio.removeEventListener("error", handleError)
  }, [currentSource, musicSources])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.src = musicSources[currentSource]
    if (isPlaying) {
      audio.play().catch((err) => {
        console.error("Error playing audio:", err)
      })
    }
  }, [currentSource, musicSources])

  const toggleMusic = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((err) => {
          console.error("Error playing audio:", err)
        })
    }
  }

  return (
    <div className="music-control">
      <button onClick={toggleMusic} aria-label={isPlaying ? "Pause music" : "Play music"}>
        {isPlaying ? <VolumeX size={24} /> : <Music size={24} />}
      </button>
      <audio ref={audioRef} loop preload="auto" />
    </div>
  )
}
