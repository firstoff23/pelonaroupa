import { useEffect, useState } from "react";

export function CrashingComponent(): null {
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    setError(new Error("Teste de Falha Induzida"));
  }, []);
  if (error) throw error;
  return null;
}

export function SettingsSectionLabel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1 pt-2">
      <p className="text-xs font-semibold uppercase text-primary">{title}</p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
