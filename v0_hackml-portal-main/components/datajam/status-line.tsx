import { cn } from "@/lib/utils"

export type Status = { kind: "ok" | "error"; text: string } | null

// Terminal-style feedback line used by the registration forms.
export function StatusLine({ status, className }: { status: Status; className?: string }) {
  if (!status) return null
  return (
    <p
      role={status.kind === "error" ? "alert" : "status"}
      className={cn("font-mono text-sm", status.kind === "error" ? "text-rose-500" : "text-teal-500", className)}
    >
      {`>>> [${status.kind === "error" ? "ERROR" : "OK"}] ${status.text}`}
    </p>
  )
}
