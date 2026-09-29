"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { discordAction, DISCORD_STATE_KEY } from "@/lib/datajam/discord"

export default function DiscordCallback() {
  const started = useRef(false)
  const [message, setMessage] = useState("Connecting your Discord account…")
  useEffect(() => {
    if (started.current) return
    started.current = true
    async function complete() {
      const params = new URLSearchParams(window.location.search)
      window.history.replaceState(window.history.state, "", "/discord/callback")
      try {
        const state = params.get("state")
        const expected = sessionStorage.getItem(DISCORD_STATE_KEY)
        sessionStorage.removeItem(DISCORD_STATE_KEY)
        if (!state || !expected || state !== expected) throw new Error("Authorization did not match this browser. Return to your dashboard and connect again.")
        if (params.has("error")) throw new Error("Discord authorization was cancelled. You can try again from your dashboard.")
        const code = params.get("code")
        if (!code) throw new Error("Discord did not return an authorization code. Please try again.")
        await discordAction("complete", { state, code })
        window.location.replace("/dashboard")
      } catch (e) { setMessage(e instanceof Error ? e.message : "Could not connect Discord. Please try again.") }
    }
    void complete()
  }, [])
  return <main className="mx-auto flex max-w-xl flex-col gap-6 p-10"><h1 className="text-2xl font-bold">Team Discord</h1><p role="status">{message}</p><Link className="underline" href="/dashboard">Return to dashboard</Link></main>
}
