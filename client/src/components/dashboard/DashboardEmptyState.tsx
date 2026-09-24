import { Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface DashboardEmptyStateProps {
  language: string;
}

export function DashboardEmptyState({ language }: DashboardEmptyStateProps) {
  const isPt = language === "pt";

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-7 bg-card border border-border rounded-2xl p-6 shadow-md max-w-lg mx-auto">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <Sparkles className="w-12 h-12 text-primary relative" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-foreground">
          {isPt ? "Bem-vindo ao AnimalMind!" : "Welcome to AnimalMind!"}
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-sm leading-relaxed">
          {isPt
            ? "Vamos configurar a sua conta. Siga os passos rápidos abaixo para começar a monitorizar o seu companheiro."
            : "Let's set up your account. Follow the quick steps below to start monitoring your pet."}
        </p>
      </div>

      <div className="w-full space-y-3 text-left">
        {/* Step 1 */}
        <div className="flex gap-4 items-center bg-secondary/15 border border-secondary/30 rounded-2xl p-4 transition-all duration-300">
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            1
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-foreground">
              {isPt ? "Adicionar o Seu Primeiro Animal" : "Add Your First Pet"}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {isPt
                ? "Crie o perfil com espécie, raça e idade do seu companheiro."
                : "Create a profile with your pet's species, breed, and age."}
            </p>
          </div>
          <Link to="/perfil">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-xs px-3.5 shadow-sm"
            >
              {isPt ? "Criar Perfil" : "Create Profile"}
            </Button>
          </Link>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4 items-center bg-muted/20 border border-border/40 rounded-2xl p-4 opacity-60">
          <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm shrink-0">
            2
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-muted-foreground">
              {isPt ? "Gravar uma Vocalização" : "Record a Vocalization"}
            </h4>
            <p className="text-[11px] text-muted-foreground/80">
              {isPt
                ? "Capte o áudio do seu animal no gravador para obter o relatório de bem-estar."
                : "Capture your pet's audio in the recorder to get a welfare report."}
            </p>
          </div>
          <span className="text-muted-foreground text-xs">
            {isPt ? "Aguardando" : "Pending"}
          </span>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4 items-center bg-muted/20 border border-border/40 rounded-2xl p-4 opacity-60">
          <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm shrink-0">
            3
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-muted-foreground">
              {isPt ? "Analisar Tendências" : "Analyze Trends"}
            </h4>
            <p className="text-[11px] text-muted-foreground/80">
              {isPt
                ? "Aceda a estatísticas semanais e alertas automáticos de alteração comportamental."
                : "Access weekly statistics and automated alerts for behavioral shifts."}
            </p>
          </div>
          <span className="text-muted-foreground text-xs">
            {isPt ? "Aguardando" : "Pending"}
          </span>
        </div>
      </div>
    </div>
  );
}
