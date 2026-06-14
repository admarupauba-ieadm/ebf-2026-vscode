import { LogoUCADMA, LogoAD } from "./Brand";
import { Instagram, MapPin, Phone } from "lucide-react";

const SOCIAL_LINKS = [
  {
    href: "https://www.instagram.com/brilhoceleste__oficial?igsh=MTVycm13emcybnI1YQ==",
    label: "Instagram UCADMA Marupaúba",
    icon: Instagram,
  },

] as const;

export function SiteFooter() {
  return (
    <footer
      className="mt-24 border-t border-[color:var(--gold)]/25 bg-[image:var(--gradient-royal)] text-white"
      role="contentinfo"
    >
      <div className="container mx-auto px-4 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2 flex gap-4 items-start">
          <LogoAD className="h-20 w-20" aria-hidden="true" />
          <div>
            <div className="font-display font-bold text-2xl">Assembleia de Deus</div>
            <div className="text-white/80">Campo Marupaúba · Tomé-Açu · Pará</div>
            <p className="text-sm text-white/70 mt-3 max-w-md">
              EBF 2026 — &ldquo;Cristo, o Ungido de Deus&rdquo;. Uma semana para encantar, ensinar e
              abençoar nossas crianças com a Palavra.
            </p>
          </div>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-[color:var(--gold)]">Contato</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Campo Marupaúba, Tomé-Açu — PA</span>
            </li>
            <li className="flex gap-2">
              <Phone className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Fale conosco:
                <br />
                <a
                  href="tel:+55991999999"
                  className="text-[color:var(--gold)] hover:underline"
                >
                  (91) 99999-9999
                </a>
              </span>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-[color:var(--gold)]">Rede Social</h4>
          <div className="flex gap-3" role="list" aria-label="Redes sociais">
            {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 hover:bg-[color:var(--gold)]/30 transition focus-visible:outline-2 focus-visible:outline-[color:var(--gold)]"
                aria-label={label}
                role="listitem"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </a>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <LogoUCADMA className="h-12 w-12 bg-white/10 rounded-full p-1" aria-hidden="true" />
            <div className="text-xs text-white/70">
              União de Crianças da
              <br />
              Assembleia de Deus
              <br />
              Campo Marupaúba
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">
        © 2026 UCADMA Marupaúba · Lucas 4:18-19
        <p>
          Desenvolvido por{" "}
          <a
            href="https://www.example.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--gold)] hover:underline"
          >
            VNEXUS DEV ()
          </a>
        </p>
      </div>
    </footer>
  );
}
