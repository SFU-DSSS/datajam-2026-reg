import { InfoPage } from "@/components/datajam/info-page"

const schedule = [
  { title: "October 17 — Registration Closes", body: "Complete your DataJam 2026 registration." },
  { title: "October 18–21 — Team Matching", body: "DSSS matches incomplete teams. Teams may have up to four members." },
  { title: "By October 24 — Working Period Selection", body: "Teams select a 3–4 day working period." },
  {
    title: "October 25–November 7 — Case Working Periods",
    body: "Receive the business case and dataset on day one of your assigned period. Presentation slides are due on the final day.",
  },
  {
    title: "November 8 — DataJam at the SUB Ballroom, SFU",
    body: "Teams present their analysis and recommendations. Preliminary round: 7-minute presentation and 3-minute Q&A. Final round: 10-minute presentation and 5-minute Q&A.",
  },
]

export default function SchedulePage() {
  return <InfoPage eyebrow="TIMELINE" title="Event Schedule" items={schedule} />
}
