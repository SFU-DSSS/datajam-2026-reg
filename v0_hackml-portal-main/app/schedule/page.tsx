import { Navbar } from "@/components/navbar"

export default function SchedulePage() {
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
                <span className="main-title">Event Schedule</span>
              </h1>
              <div className="info-section">
                <div className="feature-list">
                  <div className="feature-item">
                    <strong>October 17 — Registration Closes:</strong> <br />Complete your DataJam 2026 registration.
                  </div>
                  <div className="feature-item">
                    <strong>October 18–21 — Team Matching:</strong> <br />DSSS matches incomplete teams. Teams may have up to four members.
                  </div>
                  <div className="feature-item">
                    <strong>By October 24 — Working Period Selection:</strong> <br />Teams select a 3–4 day working period.
                  </div>
                  <div className="feature-item">
                    <strong>October 25–November 7 — Case Working Periods:</strong> <br />Receive the business case and dataset on day one of your assigned period. Presentation slides are due on the final day.
                  </div>
                  <div className="feature-item">
                    <strong>November 8 — DataJam at the SUB Ballroom, SFU:</strong> <br />Teams present their analysis and recommendations. Preliminary round: 7-minute presentation and 3-minute Q&amp;A. Final round: 10-minute presentation and 5-minute Q&amp;A.
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
