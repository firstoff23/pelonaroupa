import type React from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

export interface BreedInfoData {
  species: string;
  group?: string;
  temperament?: string[];
  description?: string;
  exercise_needs?: string;
  health_risks?: string[];
  life_expectancy?: string;
  average_weight?: string;
  origin?: string;
  grooming_needs?: string;
  trainability?: string;
  good_with_children?: boolean;
  good_with_pets?: boolean;
}

export interface Top3BreedItem {
  breed: string;
  confidence: number;
}

export interface BreedInfoCardProps {
  breed: string;
  confidence: number;
  species: string;
  top3?: Top3BreedItem[];
  info?: BreedInfoData;
  onFeedbackClick?: () => void;
}

export const BreedInfoCard: React.FC<BreedInfoCardProps> = ({
  breed,
  confidence,
  species,
  top3 = [],
  info,
  onFeedbackClick,
}) => {
  return (
    <Card className="bg-card border-border shadow-lg text-card-foreground backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
        <div>
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-semibold text-primary border-primary/30 bg-primary/10 mb-1"
          >
            {species === "cat" ? "🐱 Gato" : "🐶 Cão"} • Classificação v1
          </Badge>
          <CardTitle className="text-xl font-bold text-foreground">
            {breed}
          </CardTitle>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-primary">
            {(confidence * 100).toFixed(1)}%
          </span>
          <p className="text-[10px] text-muted-foreground">Confiança Calibrada</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Top 3 Predictions Bar */}
        {top3 && top3.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-muted-foreground">
              Top 3 Probabilidades Calibradas:
            </p>
            {top3.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">{item.breed}</span>
                  <span className="text-muted-foreground font-mono">
                    {(item.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={Math.max(item.confidence * 100, 2)}
                  className="h-1.5 bg-muted"
                />
              </div>
            ))}
          </div>
        )}

        {/* Detailed Breed Info Panel */}
        {info && (
          <div className="pt-2 space-y-3 border-t border-border">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {info.origin && (
                <Badge
                  variant="secondary"
                  className="bg-secondary/40 text-foreground border-border font-normal"
                >
                  🌐 Origem:{" "}
                  <strong className="ml-1 text-foreground">{info.origin}</strong>
                </Badge>
              )}
              {info.life_expectancy && (
                <Badge
                  variant="secondary"
                  className="bg-secondary/40 text-foreground border-border font-normal"
                >
                  ⏳ Vida:{" "}
                  <strong className="ml-1 text-foreground">
                    {info.life_expectancy}
                  </strong>
                </Badge>
              )}
              {info.average_weight && (
                <Badge
                  variant="secondary"
                  className="bg-secondary/40 text-foreground border-border font-normal"
                >
                  ⚖️ Peso:{" "}
                  <strong className="ml-1 text-foreground">
                    {info.average_weight}
                  </strong>
                </Badge>
              )}
              {info.trainability && (
                <Badge
                  variant="secondary"
                  className="bg-secondary/40 text-foreground border-border font-normal"
                >
                  🎓 Treino:{" "}
                  <strong className="ml-1 text-foreground">
                    {info.trainability}
                  </strong>
                </Badge>
              )}
            </div>

            {info.description && (
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                "{info.description}"
              </p>
            )}

            {info.temperament && info.temperament.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                  Temperamento:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {info.temperament.map((trait, tIdx) => (
                    <Badge
                      key={tIdx}
                      variant="outline"
                      className="bg-secondary/30 text-secondary-foreground text-[11px] border-secondary/40"
                    >
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {info.health_risks && info.health_risks.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                  Cuidados de Saúde:
                </p>
                <ul className="text-xs text-amber-300/90 list-disc list-inside space-y-0.5">
                  {info.health_risks.map((risk, rIdx) => (
                    <li key={rIdx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Footer */}
        {onFeedbackClick && (
          <div className="pt-2 flex justify-end border-t border-border/60">
            <button
              onClick={onFeedbackClick}
              className="text-xs text-primary hover:text-primary/80 font-medium underline flex items-center gap-1 transition-colors min-h-[44px]"
            >
              💬 Reportar correção ou feedback
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
