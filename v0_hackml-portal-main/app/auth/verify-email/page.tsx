import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Mail className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center text-foreground">Check Your Email</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              We've sent you a verification link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Please check your email and click the verification link to activate your account. Once verified, you can
              sign in and complete your registration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
