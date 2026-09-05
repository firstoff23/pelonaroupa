import { Smartphone } from "lucide-react";
import type * as React from "react";
import { Logo } from "@/components/ui/Logo";
import { useIsMobile } from "@/hooks/useMobile";

const MOBILE_URL = "https://animalmind.vercel.app";

function DesktopMobileNotice() {
  return (
    <main className="min-h-screen bg-[#0E1215] text-white flex items-center justify-center px-6 py-10 overflow-hidden">
      <section className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#161B20] p-6 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Logo className="size-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              PeloNaRoupa
            </p>
            <p className="text-sm text-white/52">Experiência mobile-first</p>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/62">
            <Smartphone className="size-3.5 text-primary" />
            Abrir no telemóvel
          </div>
          <h1 className="text-3xl font-black leading-[1.05] tracking-tight text-white">
            O PeloNaRoupa foi feito para mobile
          </h1>
          <p className="text-sm leading-6 text-white/58">
            Lê o QR code com o telemóvel para abrir a versão optimizada para
            gravações, histórico e acompanhamento dos teus animais.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-white/10 bg-white p-3">
          <img
            src="/qr-code.svg"
            alt={`QR code para abrir ${MOBILE_URL}`}
            className="mx-auto size-[232px]"
            width={232}
            height={232}
            loading="eager"
          />
        </div>

        <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Link directo
          </p>
          <a
            href={MOBILE_URL}
            className="mt-1 block text-sm font-bold text-white underline-offset-4 hover:underline"
          >
            animalmind.vercel.app
          </a>
        </div>
      </section>
    </main>
  );
}

export function MobileOnlyGate({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile === false) {
    return <DesktopMobileNotice />;
  }

  return <>{children}</>;
}
