import Image from "next/image"

const socials = [{ href: "https://www.instagram.com/sfudsss/", label: "Instagram", icon: "/datajam/instagram.svg" }]

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-border bg-background">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-16 sm:px-8 lg:px-20">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-sm font-bold text-foreground">SFU DATA SCIENCE SOCIETY</p>
            <p className="text-xs text-muted-foreground">Connecting SFU students through applied data science.</p>
          </div>
          <ul className="flex items-center gap-6">
            {socials.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} className="block opacity-100 transition-opacity hover:opacity-70">
                  <Image src={social.icon} alt="" width={20} height={20} />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px]">
          <p className="text-slate-600">© 2026 SFU DATA SCIENCE SOCIETY. ALL LOGS SECURED.</p>
          <a href="#top" className="text-primary hover:underline">
            [ BACK TO TOP ^ ]
          </a>
        </div>
      </div>
    </footer>
  )
}
