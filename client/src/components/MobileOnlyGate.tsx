import { Monitor, Smartphone } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMobile";

const MOBILE_URL = "https://animalmind.vercel.app";
const DESKTOP_STORAGE_KEY = "pelonaroupa_desktop_bypass";

function DesktopMobileNotice({ onContinue }: { onContinue: () => void }) {
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

        <div className="mt-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/62">
            <Smartphone className="size-3.5 text-primary" />
            Abrir no telemóvel
          </div>
          <h1 className="text-2xl font-black leading-[1.1] tracking-tight text-white">
            O PeloNaRoupa foi feito para mobile
          </h1>
          <p className="text-sm leading-relaxed text-white/58">
            Lê o QR code com o telemóvel para abrir a versão optimizada para
            gravações, histórico e acompanhamento dos teus animais.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-white/10 bg-white p-3">
          <img
            src="/qr-code.svg"
            alt={`QR code para abrir ${MOBILE_URL}`}
            className="mx-auto size-[200px]"
            width={200}
            height={200}
            loading="eager"
          />
        </div>

        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Link directo
          </p>
          <a
            href={MOBILE_URL}
            className="mt-0.5 block text-xs font-bold text-white underline-offset-4 hover:underline"
          >
            animalmind.vercel.app
          </a>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
          <Button
            type="button"
            onClick={onContinue}
            data-testid="continue-on-desktop-button"
            className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Monitor className="size-4" />
            Continuar no browser (Modo Desktop)
          </Button>
          <p className="text-[11px] text-white/40 text-center">
            Aviso: a interface foi optimizada para smartphones e ecrãs tácteis.
          </p>
        </div>
      </section>
    </main>
  );
}

export function MobileOnlyGate({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [bypass, setBypass] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(DESKTOP_STORAGE_KEY) === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleContinue = () => {
    try {
      localStorage.setItem(DESKTOP_STORAGE_KEY, "true");
    } catch {}
    setBypass(true);
  };

  if (isMobile === false && !bypass) {
    return <DesktopMobileNotice onContinue={handleContinue} />;
  }

  return <>{children}</>;
}
