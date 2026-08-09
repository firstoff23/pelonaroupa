import { Camera, CheckCircle2, Mic, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";

type PermState = "prompt" | "granted" | "denied" | "unknown";

function useCameraPermission(): PermState {
  const [perm, setPerm] = useState<PermState>("unknown");

  useEffect(() => {
    if (!navigator?.permissions?.query) {
      setPerm("unknown");
      return;
    }
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((result) => {
        setPerm(result.state as PermState);
        result.onchange = () => setPerm(result.state as PermState);
      })
      .catch(() => setPerm("unknown"));
  }, []);

  return perm;
}

export default function CapturePortalPage() {
  const { language } = useLanguage();
  const cameraPerm = useCameraPermission();

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        duration: 0.4,
        ease: "easeOut" as const,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 22 },
    },
  };

  function CameraPermBadge() {
    if (cameraPerm === "granted") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
          <CheckCircle2 size={10} aria-hidden="true" />
          {language === "pt" ? "Camera pronta" : "Camera ready"}
        </span>
      );
    }
    if (cameraPerm === "denied") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
          <XCircle size={10} aria-hidden="true" />
          {language === "pt" ? "Acesso negado" : "Access denied"}
        </span>
      );
    }
    if (cameraPerm === "prompt") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
          <span
            className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
            aria-hidden="true"
          />
          {language === "pt" ? "Conceder acesso" : "Grant access"}
        </span>
      );
    }
    return null;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="page-enter min-h-full px-4 pt-6 pb-6 space-y-6 max-w-lg mx-auto flex flex-col justify-center"
    >
      <div className="flex flex-col gap-1 text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {language === "pt" ? "Capturar Expressao" : "Capture Expression"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {language === "pt"
            ? "Escolha o modo de captura para analisar o estado emocional do seu animal"
            : "Choose capture mode to analyze your pet's emotional state"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Audio Card — uses Link for navigation (a11y) */}
        <motion.div variants={cardVariants}>
          <Link
            href="/gravar"
            className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
          >
            <Card className="bg-card hover:bg-card/90 border-primary/20 overflow-hidden shadow-lg transition-colors duration-300 relative h-52 flex flex-col justify-between p-4 rounded-2xl">
              <div
                className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/15 transition-all duration-300"
                aria-hidden="true"
              />
              <div className="space-y-3">
                <div
                  className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                  aria-hidden="true"
                >
                  <Mic size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {language === "pt" ? "Gravar Audio" : "Record Audio"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {language === "pt"
                      ? "Grave vocalizacoes do animal para traducao acustica imediata."
                      : "Record vocalizations for immediate acoustic analysis."}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <span
                  className="h-8 px-3 rounded-xl text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center"
                  aria-hidden="true"
                >
                  {language === "pt" ? "Gravar agora" : "Record now"}
                </span>
              </div>
            </Card>
          </Link>
        </motion.div>

        {/* Camera Card — uses Link for navigation (a11y) */}
        <motion.div variants={cardVariants}>
          <Link
            href="/camera"
            className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
          >
            <Card className="bg-card hover:bg-card/90 border-border overflow-hidden shadow-md transition-colors duration-300 relative h-32 flex items-center justify-between p-4 rounded-2xl">
              <div
                className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300"
                aria-hidden="true"
              />
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="w-11 h-11 shrink-0 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300"
                  aria-hidden="true"
                >
                  <Camera size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-foreground">
                      {language === "pt" ? "Camera Visao" : "Vision Camera"}
                    </h2>
                    <CameraPermBadge />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {language === "pt"
                      ? "Analise a postura e linguagem corporal em tempo real."
                      : "Analyze posture and body language in real time."}
                  </p>
                </div>
              </div>
              <div className="shrink-0 pl-2" aria-hidden="true">
                <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors whitespace-nowrap">
                  {language === "pt" ? "Analisar" : "Analyze"} &rarr;
                </span>
              </div>
            </Card>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
