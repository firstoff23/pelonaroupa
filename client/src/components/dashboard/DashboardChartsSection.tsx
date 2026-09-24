import { HeartPulse } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VetReportButton } from "@/components/VetReportButton";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "../../../../shared/types";
import { STATE_COLORS } from "../../../../shared/types";
import {
  ConfidenceTooltip,
  CustomTooltip,
} from "./DashboardHelpers";

interface AnimalItem {
  id: number;
  name: string;
}

interface ChartDataPoint {
  label: string;
  confidence: number;
  state: EmotionalState;
  emoji: string;
}

interface BarDataPoint {
  name: string;
  value: number;
  state: EmotionalState;
  color: string;
}

interface LineDataPoint {
  day: string;
  avg: number;
}

interface DashboardChartsSectionProps {
  displayAnimals: AnimalItem[];
  dashboardAnimalId?: number | null;
  dashboardDays: 7 | 30 | 90;
  onDaysChange: (days: 7 | 30 | 90) => void;
  onAnimalChange: (animalId: number) => void;
  dashboardChartData: ChartDataPoint[];
  dashboardNarrative?: string | null;
  dashboardStats?: any;
  selectedAnimalName: string;
  barData: BarDataPoint[];
  lineData: LineDataPoint[];
  states: EmotionalState[];
  eventsCount: number;
  language: string;
  t: (key: string) => string;
}

export function DashboardChartsSection({
  displayAnimals,
  dashboardAnimalId,
  dashboardDays,
  onDaysChange,
  onAnimalChange,
  dashboardChartData,
  dashboardNarrative,
  dashboardStats,
  selectedAnimalName,
  barData,
  lineData,
  states,
  eventsCount,
  language,
  t,
}: DashboardChartsSectionProps) {
  const isPt = language === "pt";

  return (
    <div className="space-y-5 flex flex-col">
      {/* Emotional Evolution Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              {isPt ? "Evolução Emocional" : "Emotional Trends"}
            </h2>

            {/* Timeframe Selector */}
            <div className="flex bg-slate-900/50 p-1 rounded-full border border-slate-800">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => onDaysChange(d)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-semibold transition-all tap-highlight-none",
                    dashboardDays === d
                      ? "bg-(--color-primary) text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Animal Selector (only if > 1 animal) */}
          {displayAnimals.length > 1 && (
            <Select
              value={String(dashboardAnimalId)}
              onValueChange={(val) => onAnimalChange(Number(val))}
            >
              <SelectTrigger className="h-9 rounded-xl border-slate-800 bg-slate-900/30 text-xs font-semibold focus:ring-0 focus:ring-offset-0">
                <SelectValue
                  placeholder={
                    isPt ? "Selecionar animal" : "Select animal"
                  }
                />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-800 bg-slate-900">
                {displayAnimals.map((a) => (
                  <SelectItem
                    key={a.id}
                    value={String(a.id)}
                    className="text-xs font-semibold"
                  >
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="bg-surface border border-border/70 rounded-[1.75rem] p-5 shadow-(--shadow-sm)">
          {dashboardChartData.length >= 2 ? (
            <div className="space-y-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dashboardChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 10,
                        fill: "var(--muted-foreground)",
                      }}
                      dy={10}
                    />
                    <YAxis domain={[0, 1]} hide={true} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl flex items-center gap-2">
                            <span>{data.emoji}</span>
                            <div>
                              <p className="font-semibold text-foreground">
                                {t(`states.${data.state as EmotionalState}`)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {data.label}
                              </p>
                            </div>
                          </div>
                        );
                      }}
                      cursor={{
                        stroke: "var(--border)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="confidence"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "var(--color-primary)",
                        stroke: "var(--background)",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {dashboardNarrative && (
                <div className="pt-3 border-t border-border/50 text-center">
                  <p className="text-xs text-muted-foreground font-medium">
                    {dashboardNarrative}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
              <HeartPulse className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground max-w-50 leading-relaxed">
                {isPt
                  ? "Ainda não há dados suficientes para mostrar a evolução. Faz mais gravações!"
                  : "Not enough data yet. Keep recording!"}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 px-1">
          <VetReportButton
            stats={dashboardStats}
            animalName={selectedAnimalName}
          />
        </div>
      </div>

      {/* Bar Chart: State Distribution */}
      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("dashboardPage.statesDistributionTitle")}
        </h2>
        {eventsCount === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            {t("dashboardPage.noDataAvailable")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={barData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.22 0.012 264)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={36}
              />
              <YAxis
                tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "oklch(0.17 0.012 264)" }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((entry) => (
                  <Cell
                    key={entry.state}
                    fill={STATE_COLORS[entry.state]}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Line Chart: Daily Average Confidence */}
      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("dashboardPage.avgConfidence")}
        </h2>
        {lineData.length < 2 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            {t("dashboardPage.insufficientDataChart")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart
              data={lineData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.22 0.012 264)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0.5, 1]}
                tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
              />
              <Tooltip content={<ConfidenceTooltip />} />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#2D739B"
                strokeWidth={2.5}
                dot={{ fill: "#2D739B", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#2D739B" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Emotional States Legend */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("dashboardPage.legend")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {states.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: STATE_COLORS[s] }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: STATE_COLORS[s] }}
              >
                {t(`states.${s}`)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
