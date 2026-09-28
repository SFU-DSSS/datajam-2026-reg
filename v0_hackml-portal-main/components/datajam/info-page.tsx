import type React from "react"
import { Card } from "@/components/ui/card"
import { PageShell } from "./page-shell"

export type InfoItem = { title: string; body: React.ReactNode }

// Numbered card list used by the standalone rules and schedule pages.
export function InfoPage({ eyebrow, title, items }: { eyebrow: string; title: string; items: InfoItem[] }) {
  return (
    <PageShell>
      <main className="mx-auto flex max-w-[1000px] flex-col gap-12 px-4 py-16 sm:px-8 lg:py-[100px]">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs font-bold text-teal-500">{eyebrow}</p>
          <h1 className="font-display text-[32px] font-extrabold text-foreground">{title}</h1>
        </div>
        <ol className="flex flex-col gap-5">
          {items.map((item, i) => (
            <li key={item.title}>
              <Card className="flex-row gap-6 rounded-lg p-6 shadow-none sm:p-8">
                <p className="font-mono text-2xl font-extrabold text-primary">{String(i + 1).padStart(2, "0")}</p>
                <div className="flex flex-col gap-2">
                  <h2 className="font-display text-lg font-bold text-foreground">{item.title}</h2>
                  <p className="text-sm leading-[1.6] text-muted-foreground">{item.body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </main>
    </PageShell>
  )
}
