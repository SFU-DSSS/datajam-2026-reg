import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const next = request.nextUrl.searchParams.get("next") === "/auth/reset-password" ? "/auth/reset-password" : "/dashboard"
  if (code) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }
  return NextResponse.redirect(new URL("/auth/forgot-password?expired=1", request.url))
}
