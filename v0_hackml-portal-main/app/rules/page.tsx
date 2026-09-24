import Link from "next/link"
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
                    <strong>Team Formation:</strong> Teams must consist of 1-4 members. All team members must be registered participants.
                  </div>
                  <div className="feature-item">
                    <strong>Competition Duration:</strong> The hackathon runs for 12 hours on January 31, 2026. All submissions must be completed within this timeframe.
                  </div>
                  <div className="feature-item">
                    <strong>Kaggle Platform:</strong> All model submissions must be made through the Kaggle competition platform. Teams will receive access credentials upon registration.
                  </div>
                  <div className="feature-item">
                    <strong>Code of Conduct:</strong> All participants must adhere to the DSSS Code of Conduct. Plagiarism, cheating, or any form of academic dishonesty will result in immediate disqualification.
                  </div>
                  <div className="feature-item">
                    <strong>Submission Guidelines:</strong> Each team may submit up to 5 models per day. The final leaderboard will be determined by the best submission score.
                  </div>
                  <div className="feature-item">
                    <strong>Prizes:</strong> Winners will be announced at the end of the competition. Prizes include electronic gifts, certificates, and recognition from the Data Science Student Society.
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
