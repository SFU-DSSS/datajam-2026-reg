import Link from "next/link"
import { PageShell } from "@/components/datajam/page-shell"
import { Card } from "@/components/ui/card"

export default function VerifyEmailPage() {
  return (
    <PageShell>
      <main className="mx-auto max-w-xl px-4 py-20">
        <Card className="gap-6 rounded-2xl border-primary/25 p-8 shadow-[0_12px_48px_rgba(0,240,255,0.05)]">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl">Check your email_</h1>
            <p className="text-sm text-muted-foreground">We&apos;ve sent you a verification link.</p>
          </div>
          <p className="font-mono text-sm text-teal-500">{">>> [OK] Account created. Awaiting email verification."}</p>
          <p className="text-sm text-muted-foreground">
            Click the link in your email to activate your account. Once verified, you can sign in and complete your
            registration.
          </p>
          <div className="flex w-full items-center justify-between font-mono text-xs text-primary">
            <Link href="/auth/login">SIGN IN</Link>
            <Link href="/">HOME</Link>
          </div>
        </Card>
      </main>
    </PageShell>
  )
}
