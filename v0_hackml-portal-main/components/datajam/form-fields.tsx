import type React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const fieldClass =
  "h-12 rounded-sm border-border bg-background px-4 text-sm md:text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/30"

export function FieldHeader({ htmlFor, label, required = true }: { htmlFor?: string; label: string; required?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={htmlFor} className="font-mono text-xs leading-normal font-semibold uppercase text-primary">
        {`// ${label}`}
      </Label>
      {required && <span className="font-mono text-[11px] text-slate-600">[REQUIRED]</span>}
    </div>
  )
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] leading-normal text-slate-600">{children}</p>
}

// Text input with the terminal-style "_" cursor from the design
export function TerminalInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input className={cn(fieldClass, "pr-10", className)} {...props} />
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-xs text-slate-600">
        _
      </span>
    </div>
  )
}
