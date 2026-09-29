import type React from "react"
import Image from "next/image"
import { SiteHeader } from "@/components/datajam/site-header"
import { SiteFooter } from "@/components/datajam/site-footer"

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="relative min-h-screen overflow-clip bg-background font-sans text-base leading-normal text-foreground">
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
        {children}
        <SiteFooter />
      </div>
    </div>
  )
}
