import { Plus } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "When are sign-ups due?",
    answer:
      "Sign-ups close November 4.",
  },
  {
    question: "What is the team size rule?",
    answer:
      "Teams may have up to four members. If your team is not full, We will organize team matching after registration closes if needed.",
  },
  {
    question: "What is the competition timeline?",
    answer:
      "Each team will get a week to work on the case from November 8-14. DataJam presentations are in-person on November 15.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="flex scroll-mt-24 flex-col items-center gap-14 px-4 py-20 sm:px-8 lg:py-[120px]">
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
