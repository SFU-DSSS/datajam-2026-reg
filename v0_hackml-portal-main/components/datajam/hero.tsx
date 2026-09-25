import Image from "next/image"
import { Badge } from "@/components/ui/badge"

const terminalLines = [
  "$ python --version",
  "Python 3.10.8",
  "",
  "import sfu_data_jam as dj",
  "",
  "jam = dj.DataJam(year=2026)",
  'jam.set_date("2026-11-08")',
  'jam.set_location("SUB Ballroom")',
  "jam.set_team_size(max_members=4)",
  "jam.set_format(cohorts=4, judges_per_cohort=3)",
  "[SYSTEM] Sign-ups close Oct 17...",
]

export function Hero() {
  return (
    <section
      id="about"
      className="mx-auto flex max-w-[1440px] scroll-mt-4 flex-col items-center gap-16 px-4 py-16 sm:px-8 lg:flex-row lg:px-20 lg:py-[100px]"
    >
      <div className="flex w-full min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Badge className="gap-2 rounded-full border-2 border-primary bg-white p-2 pr-2 font-mono text-xs font-bold text-background">
              <Image src="/datajam/panda.png" alt="" width={32} height={32} className="rounded-full" />
              SFU DATA SCIENCE
            </Badge>
            <Image src="/datajam/triangles.svg" alt="" width={44} height={12} />
          </div>
          <h1 className="flex flex-col gap-1 font-display text-6xl leading-none font-black text-shadow-[0_0_20px_rgba(0,240,255,0.5)] sm:text-[80px]">
            <span className="text-foreground">DATA</span>
            <span className="text-primary">JAM_</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge className="rounded-md px-4 py-2.5 font-display text-sm font-extrabold">NOV 8TH</Badge>
          <Badge variant="secondary" className="rounded-md border-border px-4 py-2.5 font-display text-sm font-extrabold">
            SUB BALLROOM · SFU
          </Badge>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-lg leading-[1.6] text-muted-foreground">
            DataJam is SFU&apos;s annual data science case competition. Work with real-world data, develop
            recommendations, and present to a 12-judge panel.
          </p>
          <p className="font-mono text-sm text-teal-500">{">>> 3–4 DAYS OF FOCUSED DATA ANALYSIS"}</p>
        </div>
      </div>

      <div
        aria-hidden
        className="flex h-[380px] w-full max-w-[520px] shrink-0 flex-col overflow-hidden rounded-lg border border-primary/25 bg-muted shadow-[0_8px_32px_rgba(0,240,255,0.08)]"
      >
        <div className="flex items-start justify-between border-b border-border bg-card px-4 py-3">
          <Image src="/datajam/terminal-dots.svg" alt="" width={42} height={10} />
          <p className="font-mono text-[11px] text-muted-foreground">bash - sfu_data_jam_2026.py</p>
          <Image src="/datajam/triangles.svg" alt="" width={44} height={12} />
        </div>
        <pre className="p-6 font-mono text-[13px] leading-[1.5] whitespace-pre-wrap text-teal-500">
          {terminalLines.join("\n")}
        </pre>
      </div>
    </section>
  )
}
