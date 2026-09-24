import Link from "next/link"
import { Navbar } from "@/components/navbar"

export default function HackMLPortal() {
  return (
    <>
      {/* Top navigation bar */}
      <Navbar />

      {/* Hero section */}
      <main>
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h1>
                <span className="year">Team Registration Portal</span>
                <span className="main-title">Join HackML 2026</span>
              </h1>
              <p className="hero-subtitle">
                The Data Science Student Society (DSSS) is excited to host HackML 2026 this January! 
                <br />Join us for a 12-hour
                model-building competition where students work in teams to solve problems through appropriate machine
                learning model applications.
              </p>
              <Link href="/auth/sign-up" className="cta-button">
                Get Started →
              </Link>
            </div>

            {/* Info cards row */}
            <div className="cards-grid">
              <div className="card">
                <div className="card-icon">📅</div>
                <h2>Date</h2>
                <p>January 31, 2026</p>
              </div>
              <div className="card">
                <div className="card-icon">⏱️</div>
                <h2>Duration</h2>
                <p>12 Hours</p>
              </div>
              <div className="card">
                <div className="card-icon">👾</div>
                <h2>Team Size</h2>
                <p>1–4 Members</p>
              </div>
              <div className="card">
                <div className="card-icon">🏆</div>
                <h2>Format</h2>
                <p>Kaggle-based</p>
              </div>
            </div>

            {/* How it works section */}
            <section className="info-section">
              <h2 className="section-title">
                <span className="section-title-text">How It Works</span>
              </h2>
              <div className="how-it-works-grid">
                <div className="card">
                  <div className="card-icon">1</div>
                  <h2>Sign Up</h2>
                  <p>Create an account and complete your participant registration.</p>
                </div>
                <div className="card">
                  <div className="card-icon">2</div>
                  <h2>Form a Team</h2>
                  <p>Create or join a team using a team code (1–4 members).</p>
                </div>
                <div className="card">
                  <div className="card-icon">3</div>
                  <h2>Compete</h2>
                  <p>Build ML models and compete on January 31, 2026.</p>
                </div>
                <div className="card">
                  <div className="card-icon">★</div>
                  <h2>Have Fun</h2>
                  <p>Enjoy a retro-themed ML hackathon with friends and prizes!</p>
                </div>
                <div className="card">
                  <div className="card-icon">✉︎</div>
                  <h2>Questions?</h2>
                  <p>Reach out to us at <u><a href="https://www.sfudsss.com/contact">SFU DSSS Contacts</a></u>!</p>
                </div>
              </div>
            </section>
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
