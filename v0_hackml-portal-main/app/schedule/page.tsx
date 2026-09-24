import Link from "next/link"
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
                    <strong>8:30 AM - Registration & Check-in:</strong> <br />Participants arrive, check in, and receive competition credentials and materials.
                  </div>
                  <div className="feature-item">
                    <strong>9:15 AM - Opening Ceremony:</strong> <br />Welcome address, competition overview, and introduction to the Kaggle dataset and problem statement.
                  </div>
                  <div className="feature-item">
                    <strong>9:30 AM - Competition Begins:</strong> <br />Teams start working on their machine learning models. Dataset and problem details are released.
                  </div>
                  <div className="feature-item">
                    <strong>12:00 PM - Lunch Break:</strong> <br />Complimentary lunch provided for all participants. Networking opportunity.
                  </div>
                  <div className="feature-item">
                    <strong>3:00 PM - Mid-point Check-in:</strong> <br />Brief progress update and Q&A session with competition organizers.
                  </div>
                  <div className="feature-item">
                    <strong>6:00 PM - Final Submission Deadline:</strong> <br />All model submissions must be completed and submitted through Kaggle by this time.
                  </div>
                  <div className="feature-item">
                    <strong>6:15 PM - Dinner & Networking:</strong> <br />Complimentary dinner provided for all participants. Networking opportunity.
                  </div>
                  <div className="feature-item">
                    <strong>8:00 PM - Closing & Awards Ceremony:</strong> <br />Event concludes with winners and awards announcement.
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
