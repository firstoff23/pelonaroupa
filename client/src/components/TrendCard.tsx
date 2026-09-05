import {
  AlertCircle,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

interface TrendCardProps {
  animalId: number;
}

export function TrendCard({ animalId }: TrendCardProps) {
  const { t, language } = useLanguage();

  const {
    data: trend,
    isLoading: isLoadingTrend,
    error: trendError,
  } = trpc.trends.getWeeklyTrend.useQuery({ animalId });
  const { data: patterns, isLoading: isLoadingPatterns } =
    trpc.trends.getPatterns.useQuery({ animalId });

  if (isLoadingTrend || isLoadingPatterns) {
    return (
      <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40 bg-slate-800" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-48 bg-slate-800" />
          <Skeleton className="h-40 w-full bg-slate-800 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 bg-slate-800 rounded-full" />
            <Skeleton className="h-6 w-32 bg-slate-800 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trendError || !trend) {
    return (
      <Card className="bg-red-500/5 border border-red-500/10 p-4 flex gap-3 items-center">
        <AlertCircle className="text-red-500" size={20} />
        <span className="text-xs text-muted-foreground">
          {language === "pt"
            ? "Erro ao carregar tendências."
            : "Error loading trends."}
        </span>
      </Card>
    );
  }

  const direction =
    trend.trend === "up" || trend.trend === "down" || trend.trend === "stable"
      ? trend.trend
      : "stable";
  const percentageChange =
    typeof trend.percentageChange === "number" ? trend.percentageChange : 0;
  const dailyScores = Array.isArray(trend.dailyScores) ? trend.dailyScores : [];
  const message =
    typeof trend.message === "string" && trend.message.trim().length > 0
      ? trend.message
      : language === "pt"
        ? "Ainda não há dados suficientes para calcular uma tendência fiável."
        : "There is not enough data yet to calculate a reliable trend.";
  const patternList = Array.isArray(patterns?.patterns)
    ? patterns.patterns
    : [];

  return (
    <Card className="bg-card border-border backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {language === "pt" ? "Tendência de Bem-estar" : "Well-being Trend"}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1 space-y-4">
        {/* Badge & Value */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            {direction === "up" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <TrendingUp size={12} />
                {percentageChange > 0
                  ? `+${percentageChange}%`
                  : `${percentageChange}%`}{" "}
                {language === "pt" ? "esta semana" : "this week"}
              </span>
            )}
            {direction === "down" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <TrendingDown size={12} />
                {percentageChange}%{" "}
                {language === "pt" ? "esta semana" : "this week"}
              </span>
            )}
            {direction === "stable" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tertiary/15 text-tertiary border border-tertiary/30">
                <Minus size={12} />
                {language === "pt" ? "Estável" : "Stable"}
              </span>
            )}
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-foreground leading-relaxed">{message}</p>

        {/* Line Chart */}
        {dailyScores.length > 0 && (
          <div className="h-32 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailyScores}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#8C9EA6" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "#8C9EA6" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-card border border-border px-2.5 py-1 rounded-lg text-[10px] shadow-xl">
                        <p className="font-semibold text-primary">
                          Score: {payload[0].value}%
                        </p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#194D91"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#194D91", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#2D739B" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pattern Chips */}
        {patternList.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {language === "pt"
                ? "Padrões Identificados:"
                : "Identified Patterns:"}
            </p>
            <div className="flex flex-col gap-1.5">
              {patternList.map((p, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-secondary/15 text-foreground border border-secondary/20 px-3 py-1.5 rounded-lg leading-normal flex items-start gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
