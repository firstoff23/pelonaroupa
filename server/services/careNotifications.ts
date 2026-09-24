import { sendPushNotification } from "../_core/pushNotification";
import { getSupabase } from "../db";

// In-memory debounce map to prevent notification spam across family members
// key: `${familyId}:${animalId}`, value: timestamp of last notification
const lastCareNotificationMap = new Map<string, number>();
const GROUPING_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface CareNotificationPayload {
  animalId: number;
  animalName: string;
  loggedByUserId: number;
  loggedByUserName: string;
  careType: string;
  title: string;
}

/**
 * Sends a non-spammy grouped push notification to family co-guardians
 * when a care task is completed.
 */
export async function notifyFamilyCareLogged(
  payload: CareNotificationPayload,
): Promise<void> {
  try {
    const supabase = getSupabase();

    // 1. Find all families sharing this animal
    const { data: familyAnimals, error: famErr } = await supabase
      .from("family_animals")
      .select("family_id")
      .eq("animal_id", payload.animalId);

    if (famErr || !familyAnimals || familyAnimals.length === 0) {
      return; // Not a family-shared animal
    }

    const familyIds = familyAnimals.map((fa) => Number(fa.family_id));

    // 2. Find other members in these families (excluding the user who logged the care)
    const { data: members, error: memErr } = await supabase
      .from("family_members")
      .select("user_id, family_id")
      .in("family_id", familyIds)
      .neq("user_id", payload.loggedByUserId);

    if (memErr || !members || members.length === 0) {
      return;
    }

    const recipientUserIds = Array.from(
      new Set(members.map((m) => Number(m.user_id))),
    );

    // 3. Grouping & Anti-Spam Check
    const key = `${familyIds[0]}:${payload.animalId}`;
    const now = Date.now();
    const lastSent = lastCareNotificationMap.get(key) || 0;

    if (now - lastSent < GROUPING_WINDOW_MS) {
      // Grouping window active: skip redundant alerts to prevent notification fatigue
      return;
    }

    lastCareNotificationMap.set(key, now);

    // 4. Send opt-in notification to each co-guardian
    const careEmoji =
      payload.careType === "feeding"
        ? "🥣"
        : payload.careType === "medication"
          ? "💊"
          : payload.careType === "walk"
            ? "🦮"
            : payload.careType === "hygiene"
              ? "🧼"
              : "🐾";

    for (const recipientId of recipientUserIds) {
      try {
        await sendPushNotification(recipientId, {
          title: `${careEmoji} Cuidado: ${payload.animalName}`,
          body: `${payload.loggedByUserName} marcou "${payload.title}" como concluído.`,
          data: {
            url: `/familia`,
            animalId: payload.animalId,
            type: "family_care",
          },
        });
      } catch (_pushErr) {
        // Individual push failures should not break application flow
      }
    }
  } catch (err) {
    console.warn(
      "[CareNotifications] Error sending family care notification:",
      err,
    );
  }
}
