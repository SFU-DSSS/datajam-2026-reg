import Image from "next/image"

const terminalLines = [
  "$ python --version",
  "Python 3.10.8",
  "",
  "import sfu_data_jam as dj",
  "",
  "jam = dj.DataJam(year=2026)",
  'jam.set_date("2026-11-15")',
  'jam.set_location("SUB Ballroom")',
  "jam.set_team_size(max_members=4)",
  "jam.set_format(cohorts=4, judges_per_cohort=3)",
  "[SYSTEM] Sign-ups close Oct 24...",
]

export function Hero() {
  return (
    <section
      id="about"
      className="mx-auto flex max-w-[1440px] scroll-mt-24 flex-col items-center gap-16 px-4 py-16 sm:px-8 lg:flex-row lg:px-20 lg:py-[100px]"
    >
      <div className="flex w-full min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image src="/datajam/panda-logo.png" alt="" width={35} height={48} />
              <span className="font-mono text-base font-bold whitespace-nowrap text-foreground">SFU DATA SCIENCE</span>
            </div>
            <Image src="/datajam/triangles.svg" alt="" width={44} height={12} />
          </div>
          <h1 className="flex flex-col gap-1 font-display text-6xl leading-none font-black text-shadow-[0_0_20px_rgba(0,240,255,0.5)] sm:text-[80px]">
            <span className="text-foreground">DATA</span>
            <span className="text-primary">JAM</span>
          </h1>
        </div>

        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          {[
            { label: "DATE", value: "NOV 15TH" },
            { label: "VENUE", value: "SUB BALLROOM · SFU" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1 border-l-2 border-primary pl-4">
              <dt className="font-mono text-[11px] font-semibold text-muted-foreground">{`// ${item.label}`}</dt>
              <dd className="font-display text-lg font-extrabold text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-4">
          <p className="text-lg leading-[1.6] text-muted-foreground">
            DataJam is SFU&apos;s annual data science case competition. Work with real-world data, develop
            recommendations, and present to a 12-judge panel.
          </p>
          <p className="font-mono text-sm text-teal-500">{">>> 3 DAYS OF FOCUSED DATA ANALYSIS"}</p>
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
