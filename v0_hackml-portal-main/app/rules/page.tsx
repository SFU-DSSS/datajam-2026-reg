import { Navbar } from "@/components/navbar"

export default function RulesPage() {
  return (
    <>
      {/* Top navigation bar */}
      <Navbar />

      {/* Main content */}
      <main>
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h1>
                <span className="main-title">Competition Rules</span>
              </h1>
              <div className="info-section">
                <div className="feature-list">
                  <div className="feature-item">
                    <strong>Team Formation:</strong> Teams may have up to four members. All team members must be registered participants. DSSS will match incomplete teams October 18–21.
                  </div>
                  <div className="feature-item">
                    <strong>Competition Duration:</strong> Teams work during an assigned 3–4 day period between October 25 and November 7, 2026, then present on November 8 at the SUB Ballroom, SFU.
                  </div>
                  <div className="feature-item">
                    <strong>Case &amp; Dataset:</strong> The business case and dataset are issued on day one of your working period. Open-source external data may be used alongside the provided dataset.
                  </div>
                  <div className="feature-item">
                    <strong>Code of Conduct:</strong> All participants must adhere to the DSSS Code of Conduct. Plagiarism, cheating, or any form of academic dishonesty will result in immediate disqualification.
                  </div>
                  <div className="feature-item">
                    <strong>Submission &amp; Presentations:</strong> Presentation slides are due on the final day of your working period. The preliminary round includes a 7-minute presentation and 3-minute Q&amp;A; the final round includes a 10-minute presentation and 5-minute Q&amp;A.
                  </div>
                  <div className="feature-item">
                    <strong>Competition Format &amp; Prizes:</strong> The planned format is 24 teams in four cohorts, with three judges selecting one finalist from each cohort. The total planned prize budget is $400: 4 × $50, 4 × $30, and 4 × $20.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <p>Hosted by the Data Science Student Society (DSSS) at Simon Fraser University</p>
      </footer>
    </>
  )
}
