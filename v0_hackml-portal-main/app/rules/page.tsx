import { InfoPage } from "@/components/datajam/info-page"

const rules = [
  {
    title: "Team Formation",
    body: "Teams may have up to four members. All team members must be registered participants.",
  },
  {
    title: "Competition Duration",
    body: "Teams work during the period between November 8 and November 14, 2026, then present on November 15 at the SUB Ballroom, SFU.",
  },
  {
    title: "Case & Dataset",
    body: "The business case and dataset are issued on November 8. Open-source external data may be used alongside the provided dataset.",
  },
  {
    title: "Code of Conduct",
    body: "All participants must adhere to the DSSS Code of Conduct. Plagiarism, cheating, or any form of academic dishonesty will result in immediate disqualification.",
  },
  {
    title: "Submission & Presentations",
    body: "Presentation slides are due on November 14. The preliminary round includes a 7-minute presentation and 3-minute Q&A; the final round includes a 10-minute presentation and 5-minute Q&A.",
  },
  {
    title: "Competition Format & Prizes",
    body: "The planned format is 24 teams in four cohorts, with three judges selecting one finalist from each cohort. The total planned prize budget is $400: 4 × $50, 4 × $30, and 4 × $20.",
  },
]

export default function RulesPage() {
  return <InfoPage eyebrow="RULEBOOK" title="Competition Rules" items={rules} />
}
