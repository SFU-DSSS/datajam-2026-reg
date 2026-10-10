import { InfoPage } from "@/components/datajam/info-page"

const rules = [
  {
    title: "Team Formation",
    body: "Teams may have up to four members. All team members must be registered participants. DSSS will match incomplete teams October 25–28.",
  },
  {
    title: "Competition Duration",
    body: "Teams work during an assigned 3–4 day period between November 1 and November 14, 2026, then present on November 15 at the SUB Ballroom, SFU.",
  },
  {
    title: "Case & Dataset",
    body: "The business case and dataset are issued on day one of your working period. Open-source external data may be used alongside the provided dataset.",
  },
  {
    title: "Code of Conduct",
    body: "All participants must adhere to the DSSS Code of Conduct. Plagiarism, cheating, or any form of academic dishonesty will result in immediate disqualification.",
  },
  {
    title: "Submission & Presentations",
    body: "Presentation slides are due on the final day of your working period. The preliminary round includes a 7-minute presentation and 3-minute Q&A; the final round includes a 10-minute presentation and 5-minute Q&A.",
  },
  {
    title: "Competition Format & Prizes",
    body: "The planned format is 24 teams in four cohorts, with three judges selecting one finalist from each cohort. The total planned prize budget is $400: 4 × $50, 4 × $30, and 4 × $20.",
  },
]

export default function RulesPage() {
  return <InfoPage eyebrow="RULEBOOK" title="Competition Rules" items={rules} />
}
