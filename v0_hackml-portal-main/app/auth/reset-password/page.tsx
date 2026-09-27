import { PageShell } from "@/components/datajam/page-shell"
import { PasswordForm } from "@/components/datajam/password-form"
import { Card } from "@/components/ui/card"
export default function ResetPasswordPage() {
  return <PageShell><main className="mx-auto max-w-xl px-4 py-20"><Card className="gap-6 rounded-2xl border-primary/25 p-8"><h1 className="font-display text-2xl">Choose a new password_</h1><p className="text-sm text-muted-foreground">Use at least eight characters.</p><PasswordForm reset /></Card></main></PageShell>
}
