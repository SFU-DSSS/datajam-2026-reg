import Image from "next/image"
import { Card } from "@/components/ui/card"

const steps = [
  {
    number: "01",
    title: "Case & Dataset Issued",
    body: "Receive the business case and dataset on day one of your assigned 3–4 day working period.",
  },
  {
    number: "02",
    title: "Analyze & Build",
    body: "Work with your team of up to four. Open-source external data may be used alongside the provided dataset.",
  },
  {
    number: "03",
    title: "Present on Nov 8",
    body: "Preliminary round: 7-minute presentation + 3-minute Q&A. Final round: 10-minute presentation + 5-minute Q&A.",
  },
]

export function ChallengeStructure() {
  return (
    <section id="schedule" className="scroll-mt-4 border-t border-border">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-14 px-4 py-16 sm:px-8 lg:px-20 lg:py-[100px]">
        <div className="flex items-end justify-between gap-6">
          <div className="flex max-w-[500px] flex-col gap-3">
            <p className="font-mono text-xs font-bold text-teal-500">CHALLENGE STRUCTURE</p>
            <h2 className="font-display text-[32px] font-extrabold text-foreground">3–4 Day Case Sprint</h2>
          </div>
          <Image src="/datajam/triangles.svg" alt="" width={44} height={12} />
        </div>
        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number}>
              <Card className="h-full gap-5 rounded-lg p-8 shadow-none">
                <p className="font-mono text-2xl font-extrabold text-primary">{step.number}</p>
                <h3 className="font-display text-lg font-bold text-foreground">{step.title}</h3>
                <p className="text-sm leading-[1.6] text-muted-foreground">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
