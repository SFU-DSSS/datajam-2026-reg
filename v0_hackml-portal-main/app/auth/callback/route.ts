import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const isReset = request.nextUrl.searchParams.get("next") === "/auth/reset-password"
  if (code) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(isReset ? "/auth/reset-password" : "/dashboard", request.url))
  }
  if (isReset) return NextResponse.redirect(new URL("/auth/forgot-password?expired=1", request.url))
  // Supabase confirms the email before redirecting here with a code, so a failed exchange
  // (usually the link opened in another browser) still leaves the account verified.
  return NextResponse.redirect(new URL(code ? "/auth/login?verified=1" : "/auth/login?expired=1", request.url))
}
