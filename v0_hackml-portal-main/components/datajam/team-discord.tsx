"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { discordAction, DISCORD_STATE_KEY, type DiscordStatus } from "@/lib/datajam/discord"

export function TeamDiscord({ teamId }: { teamId: string }) {
  const [status, setStatus] = useState<DiscordStatus | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let polls = 0
    setStatus(null)
    setError("")
    async function refresh() {
      try {
        const next = await discordAction("status")
        if (cancelled) return
        setStatus(next)
        if (next.connected && !next.chat_url && !next.needs_reconnect && polls++ < 12) timer = setTimeout(refresh, 5000)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Discord is unavailable.")
      }
    }
    void refresh()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [teamId])

  async function connect() {
    setBusy(true)
    setError("")
    try {
      if (status?.connected && !status.needs_reconnect) {
        setStatus(await discordAction("status"))
        return
      }
      const result = await discordAction<{ state: string; url: string }>("start")
      sessionStorage.setItem(DISCORD_STATE_KEY, result.state)
      window.location.assign(result.url)
    } catch (e) { setError(e instanceof Error ? e.message : "Could not connect Discord.") }
    finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-primary/25 p-4">
      {status?.chat_url ? (
        <Button asChild className="font-mono text-xs"><a href={status.chat_url} target="_blank" rel="noopener noreferrer">Open team chat</a></Button>
      ) : (
        <Button disabled={busy} onClick={connect} className="font-mono text-xs">
          {busy ? "Connecting…" : status?.needs_reconnect ? "Reconnect Discord" : status?.connected ? "Refresh Discord status" : "Join team Discord"}
        </Button>
      )}
      <p className="text-sm text-muted-foreground" role="status">
        {status?.chat_url ? "Your private team text channel is ready." : status?.connected && !status.needs_reconnect
          ? "Discord is connected. Team access is syncing; refresh shortly." : "Connect your Discord account to join your team’s private text channel."}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
