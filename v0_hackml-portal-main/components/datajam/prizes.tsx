import { Card } from "@/components/ui/card"

const cards = [
  {
    eyebrow: "// TEAM PRIZES",
    eyebrowClass: "text-teal-500",
    title: "$400 in Total Prize Value",
    body: "Planned prize breakdown: first place ($50 in prize value per person), second place ($30 in prize value per person), and third place ($20 in prize value per person).",
  },
  {
    eyebrow: "// COMPETITION FORMAT",
    eyebrowClass: "text-rose-500",
    title: "24 Teams · 4 Cohorts",
    body: "Up to four students per team. Six teams per cohort, with three judges selecting one finalist from each cohort.",
  },
]

export function Prizes() {
  return (
    <section id="prizes" className="scroll-mt-4 border-y border-primary/25 bg-muted">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-14 px-4 py-16 sm:px-8 lg:px-20 lg:py-[100px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex flex-wrap items-center gap-x-4 font-display text-2xl font-extrabold sm:text-[28px]">
            <span className="text-foreground">PRIZES &amp; COMPETITION FORMAT</span>
            <span aria-hidden className="text-primary">
              {"<<<"}
            </span>
          </h2>
          <p className="font-mono text-sm text-muted-foreground">[ PRIZE BUDGET $400 ]</p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {cards.map((card) => (
            <Card key={card.title} className="gap-6 rounded-lg bg-background p-8 shadow-none sm:p-10">
              <p className={`font-mono text-sm font-bold ${card.eyebrowClass}`}>{card.eyebrow}</p>
              <h3 className="font-display text-[32px] font-extrabold text-foreground">{card.title}</h3>
              <p className="text-sm leading-[1.6] text-muted-foreground">{card.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
