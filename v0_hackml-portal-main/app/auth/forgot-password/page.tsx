import { PageShell } from "@/components/datajam/page-shell"
import { PasswordForm } from "@/components/datajam/password-form"
import { Card } from "@/components/ui/card"
export default function ForgotPasswordPage() {
  return <PageShell><main className="mx-auto max-w-xl px-4 py-20"><Card className="gap-6 rounded-2xl border-primary/25 p-8"><h1 className="font-display text-2xl">Reset your password_</h1><p className="text-sm text-muted-foreground">Enter your login email to receive a reset link.</p><PasswordForm reset={false} /></Card></main></PageShell>
}
