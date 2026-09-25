import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/datajam/site-header"
import { Hero } from "@/components/datajam/hero"
import { RegistrationPortal } from "@/components/datajam/registration-portal"
import { ChallengeStructure } from "@/components/datajam/challenge-structure"
import { Prizes } from "@/components/datajam/prizes"
import { Faq } from "@/components/datajam/faq"
import { SiteFooter } from "@/components/datajam/site-footer"

export default async function DataJamPortal() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isRegistered = false
  if (user) {
    const { data: participant } = await supabase.from("participants").select("id").eq("id", user.id).maybeSingle()
    isRegistered = Boolean(participant)
  }

  return (
    <div id="top" className="relative overflow-hidden bg-background font-sans text-base leading-normal text-foreground">
      {/* Background glows */}
      <Image
        src="/datajam/glow-left.svg"
        alt=""
        width={840}
        height={840}
        priority
        className="pointer-events-none absolute top-[-20px] left-[-320px] max-w-none"
      />
      <Image
        src="/datajam/glow-right.svg"
        alt=""
        width={1000}
        height={1000}
        priority
        className="pointer-events-none absolute top-[450px] right-[-350px] max-w-none"
      />

      <div className="relative">
        <SiteHeader />
        <main>
          <Hero />
          <RegistrationPortal isSignedIn={Boolean(user)} isRegistered={isRegistered} />
          <ChallengeStructure />
          <Prizes />
          <Faq />
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}
