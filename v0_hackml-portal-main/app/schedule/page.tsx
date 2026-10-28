import { InfoPage } from "@/components/datajam/info-page"

const schedule = [
  { title: "November 4 — Registration Closes", body: "Complete your DataJam 2026 registration." },
  { title: "November 4-7 — Team Formation", body: "Form your team and finalize your group members." },
  {
    title: "November 8–14 — Case Working Periods",
    body: "Receive the business case and dataset on November 8. Presentation slides are due on November 14.",
  },
  {
    title: "November 15 — DataJam at the SUB Ballroom, SFU",
    body: "Teams present their analysis and recommendations. Preliminary round: 7-minute presentation and 3-minute Q&A. Final round: 10-minute presentation and 5-minute Q&A.",
  },
]

export default function SchedulePage() {
  return <InfoPage eyebrow="TIMELINE" title="Event Schedule" items={schedule} />
}
