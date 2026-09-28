import { Plus } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "When are sign-ups due?",
    answer:
      "Sign-ups close October 17. DSSS will match incomplete teams October 18–21; teams then select a 3–4 day working period by October 24.",
  },
  {
    question: "What is the team size rule?",
    answer:
      "Teams may have up to four members. If your team is not full, DSSS will organize team matching after registration closes.",
  },
  {
    question: "What is the competition timeline?",
    answer:
      "Working periods run October 25–November 7. The case and dataset are issued on day one; presentation slides are due on the final day. DataJam is November 8.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="flex scroll-mt-4 flex-col items-center gap-14 px-4 py-20 sm:px-8 lg:py-[120px]">
      <h2 className="text-center font-display text-[32px] font-extrabold text-foreground">FAQ</h2>
      <Accordion type="multiple" defaultValue={faqs.map((faq) => faq.question)} className="flex w-full max-w-[800px] flex-col gap-4">
        {faqs.map((faq) => (
          <AccordionItem
            key={faq.question}
            value={faq.question}
            className="rounded-lg border border-border bg-card px-5 last:border-b"
          >
            <AccordionTrigger
              icon={<Plus className="size-5 shrink-0 text-primary transition-transform duration-200" />}
              className="items-center py-5 font-display text-base font-medium text-slate-50 hover:no-underline [&[data-state=open]>svg]:rotate-0"
            >
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-sm leading-[1.5] text-muted-foreground">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
