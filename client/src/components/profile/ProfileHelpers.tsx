import { Check, PawPrint } from "lucide-react";
import { motion } from "motion/react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "../../../../shared/types";
import { STATE_LABELS } from "../../../../shared/types";

const STATES: EmotionalState[] = [
  "distress",
  "attention",
  "excitement",
  "hunger",
  "alert",
  "relaxed",
];

export function compressImageToWebP(
  file: File,
  maxWidth = 400,
  maxHeight = 400,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/webp", 0.8);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function AnimalCard({
  animal,
  active,
  onSelect,
  index,
}: {
  animal: {
    id: number;
    name: string;
    species: string;
    breed: string | null;
    age: number | null;
    isActive: boolean;
  };
  active: boolean;
  onSelect: () => void;
  index: number;
}) {
  const { t } = useLanguage();
  return (
    <motion.button
      onClick={onSelect}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={cn(
        "flex-shrink-0 w-36 rounded-2xl p-4 border transition-all duration-200 text-left",
        "active:scale-95",
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/50",
      )}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
        <PawPrint size={20} className="text-primary" />
      </div>
      <p className="font-semibold text-sm text-foreground truncate">
        {animal.name}
      </p>
      <p className="text-xs text-muted-foreground truncate">
        {animal.breed ?? "—"}
      </p>
      {animal.age !== null && (
        <p className="text-xs text-muted-foreground">
          {animal.age}{" "}
          {animal.age === 1 ? t("profilePage.year") : t("profilePage.years")}
        </p>
      )}
      {active && (
        <Badge className="mt-2 text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground">
          <Check size={10} className="mr-0.5" /> {t("profilePage.active")}
        </Badge>
      )}
    </motion.button>
  );
}

export function WeeklyChart({ animalId }: { animalId: number }) {
  const { t } = useLanguage();
  const { data: events = [] } = trpc.animals.weeklyStats.useQuery({ animalId });

  const counts: Record<EmotionalState, number> = {
    distress: 0,
    attention: 0,
    excitement: 0,
    hunger: 0,
    alert: 0,
    relaxed: 0,
  };
  for (const e of events) {
    if (e.state in counts) counts[e.state as EmotionalState]++;
  }

  const chartData = STATES.map((s) => ({
    state: STATE_LABELS[s],
    value: counts[s],
    fullMark: Math.max(...Object.values(counts), 1),
  }));

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        {t("dashboardPage.noRecords")}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="oklch(0.22 0.012 264)" />
        <PolarAngleAxis
          dataKey="state"
          tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 10 }}
        />
        <Radar
          name="Estados"
          dataKey="value"
          stroke="#2D739B"
          fill="#2D739B"
          fillOpacity={0.25}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
          itemStyle={{ color: "hsl(var(--foreground))" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
