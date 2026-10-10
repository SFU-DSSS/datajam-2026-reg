import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { HeaderAuthLink } from "./header-auth-link"
import { socials } from "./socials"

const links = [
  { href: "/schedule", label: "SCHEDULE" },
  { href: "/rules", label: "RULES" },
  { href: "/#faq", label: "FAQ" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-8 lg:px-20">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/datajam/panda-logo.png" alt="" width={35} height={48} />
            <span className="font-mono text-base font-bold whitespace-nowrap text-foreground">SFU DATA SCIENCE</span>
          </Link>
          <ul className="hidden items-center gap-4 sm:flex">
            {socials.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} className="block transition-opacity hover:opacity-70">
                  <Image src={social.icon} alt="" width={20} height={20} />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <nav className="flex items-center gap-6 lg:gap-8">
          <ul className="hidden items-center gap-5 md:flex lg:gap-8">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-mono text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-primary"
                >
                  [ {link.label} ]
                </a>
              </li>
            ))}
          </ul>
          <Badge
            variant="outline"
            className="hidden gap-2 rounded-full border-primary bg-primary/8 px-3 py-1.5 font-mono text-xs font-semibold text-primary uppercase sm:inline-flex md:hidden lg:inline-flex"
          >
            <Image src="/datajam/status-dot.svg" alt="" width={8} height={8} />
            Sign-ups Due Oct 24
          </Badge>
          <HeaderAuthLink />
        </nav>
      </div>
    </header>
  )
}
