import { getRegistration } from "@/lib/datajam/server"
import { PageShell } from "@/components/datajam/page-shell"
import { Hero } from "@/components/datajam/hero"
import { RegistrationPortal } from "@/components/datajam/registration-portal"
import { ChallengeStructure } from "@/components/datajam/challenge-structure"
import { Prizes } from "@/components/datajam/prizes"
import { Faq } from "@/components/datajam/faq"

export default async function DataJamPortal() {
  const registration = await getRegistration()

  return (
    <PageShell>
      <main>
        <Hero />
        <RegistrationPortal registration={registration} />
        <ChallengeStructure />
        <Prizes />
        <Faq />
      </main>
    </PageShell>
  )
}
