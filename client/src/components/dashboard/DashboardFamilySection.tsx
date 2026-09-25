import { Mail } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface Invitation {
  id: number;
  ownerName: string;
  animalName: string;
  animalSpecies?: string | null;
  permission: "read" | "write";
}

interface FamilyActivityItem {
  id: number;
  message: string;
  createdAt: Date | string;
}

interface DashboardFamilySectionProps {
  invitations?: Invitation[] | null;
  familyActivity?: FamilyActivityItem[] | null;
  isResponding: boolean;
  onRespond: (invitationId: number, action: "accept" | "reject") => void;
  language: string;
  t: (key: string) => string;
}

export function DashboardFamilySection({
  invitations,
  familyActivity,
  isResponding,
  onRespond,
  language,
  t,
}: DashboardFamilySectionProps) {
  const isPt = language === "pt";

  return (
    <div className="space-y-4">
      {/* Pending Invitations */}
      {(invitations?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {invitations?.map((inv) => (
            <div
              key={inv.id}
              className="bg-linear-to-r from-secondary/15 to-primary/15 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3 page-enter"
            >
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">
                    {t("dashboardPage.invitationTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {isPt ? (
                      <>
                        <strong>{inv.ownerName}</strong> quer partilhar o perfil
                        de <strong>{inv.animalName}</strong> (
                        {inv.animalSpecies === "dog" ? "cão" : "gato"}) contigo
                        como co-tutor (
                        <strong>
                          {inv.permission === "write"
                            ? t("dashboardPage.permissionWrite")
                            : t("dashboardPage.permissionRead")}
                        </strong>
                        ).
                      </>
                    ) : (
                      <>
                        <strong>{inv.ownerName}</strong> wants to share{" "}
                        <strong>{inv.animalName}</strong>'s profile (
                        {inv.animalSpecies === "dog" ? "dog" : "cat"}) with you
                        as a co-guardian (
                        <strong>
                          {inv.permission === "write"
                            ? t("dashboardPage.permissionWrite")
                            : t("dashboardPage.permissionRead")}
                        </strong>
                        ).
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onRespond(inv.id, "accept")}
                  disabled={isResponding}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs h-8 font-semibold"
                >
                  {t("dashboardPage.accept")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRespond(inv.id, "reject")}
                  disabled={isResponding}
                  className="flex-1 border-border hover:bg-secondary rounded-xl text-xs h-8 font-semibold"
                >
                  {t("dashboardPage.reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Family Activity Feed */}
      {(familyActivity?.length ?? 0) > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("dashboardPage.familyActivity")}
            </h2>
            <Link to="/family">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary"
              >
                {t("dashboardPage.view")}
              </Button>
            </Link>
          </div>
          {familyActivity?.slice(0, 3).map((item) => {
            const minutes = Math.max(
              1,
              Math.round(
                (Date.now() - new Date(item.createdAt).getTime()) / 60000,
              ),
            );
            const minLabel =
              minutes === 1
                ? t("dashboardPage.minuteAgo")
                : t("dashboardPage.minutesAgo");
            return (
              <p key={item.id} className="text-xs text-muted-foreground">
                {item.message} {t("dashboardPage.ago")} {minutes} {minLabel}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
