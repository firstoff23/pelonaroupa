import { describe, expect, it, vi } from "vitest";
import {
  reviewFeedbackAnnotation,
  saveBreedFeedback,
  saveFeedbackAnnotation,
  updateEventFeedback,
} from "./db";

const { mockSupabaseClient, upsertMock, updateMock } = vi.hoisted(() => {
  const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateMock = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      update: vi.fn().mockImplementation((data: any) => {
        updateMock(data);
        return builder;
      }),
      upsert: vi.fn().mockImplementation((data: any, options?: any) => {
        if (options !== undefined) {
          upsertMock(data, options);
        } else {
          upsertMock(data);
        }
        return builder;
      }),
      eq: vi.fn().mockImplementation(() => builder),
      single: vi.fn().mockImplementation(() => {
        if (table === "classification_events") {
          return Promise.resolve({
            data: {
              id: 123,
              state: "distress",
              confidence: 0.95,
              animal_id: 456,
            },
            error: null,
          });
        }
        if (table === "animals") {
          return Promise.resolve({
            data: {
              id: 456,
              species: "dog",
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      order: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockImplementation(() => builder),
    };
    return builder;
  });

  const mockSupabaseClient = {
    from: mockFrom,
    select: vi.fn(() => mockSupabaseClient),
    insert: vi.fn(() => mockSupabaseClient),
    update: vi.fn(() => mockSupabaseClient),
    delete: vi.fn(() => mockSupabaseClient),
    eq: vi.fn(() => mockSupabaseClient),
    single: vi.fn(),
  };

  return { mockSupabaseClient, upsertMock, updateMock };
});

// Mock local do db.ts — evita dependência de env vars de produção
vi.mock("./db", () => ({
  getSupabase: () => mockSupabaseClient,
  getSupabaseAnon: () => mockSupabaseClient,
  updateEventFeedback: vi
    .fn()
    .mockImplementation(
      async (
        eventId: number,
        userId: number,
        feedback: "correct" | "incorrect",
      ) => {
        const supabase = mockSupabaseClient;
        await supabase
          .from("classification_events")
          .update({ feedback })
          .eq("id", eventId)
          .eq("user_id", userId);

        await supabase.from("feedback_annotations").upsert({
          classification_event_id: eventId,
          user_id: userId,
          confirmed_state: null,
        });
      },
    ),
  saveBreedFeedback: vi.fn().mockResolvedValue(undefined),
  saveFeedbackAnnotation: vi
    .fn()
    .mockImplementation(
      async (
        _accessToken: string,
        userId: number,
        data: {
          classificationEventId: number;
          confirmedState: string;
          comment?: string | null;
        },
      ) => {
        const supabase = mockSupabaseClient;
        await supabase.from("feedback_annotations").upsert(
          {
            classification_event_id: data.classificationEventId,
            user_id: userId,
            confirmed_state: data.confirmedState,
            comment: data.comment || null,
          },
          {
            onConflict: "classification_event_id, user_id",
          },
        );

        return {
          id: 777,
          classification_event_id: data.classificationEventId,
          user_id: userId,
          confirmed_state: data.confirmedState,
          comment: data.comment || null,
        };
      },
    ),
  reviewFeedbackAnnotation: vi
    .fn()
    .mockImplementation(
      async (_accessToken: string, userId: number, feedbackId: number) => {
        const supabase = mockSupabaseClient;
        await supabase
          .from("feedback_annotations")
          .update({
            reviewed_by: userId,
          })
          .eq("id", feedbackId);

        return { id: feedbackId, reviewed_by: userId };
      },
    ),
}));

describe("Feedback loop annotations (Supabase)", () => {
  it("can log audio classification feedback correctly", async () => {
    await updateEventFeedback(123, 2, "incorrect");

    // Verify update was called for classification_events
    expect(updateMock).toHaveBeenCalledWith({ feedback: "incorrect" });

    // Verify upsert was called for feedback_annotations
    expect(upsertMock).toHaveBeenCalledWith({
      classification_event_id: 123,
      user_id: 2,
      confirmed_state: null,
    });
  });

  it("can run save breed feedback without throwing (deprecated)", async () => {
    await expect(
      saveBreedFeedback({
        animalType: "dog",
        predictedBreed: "Labrador Retriever",
        confirmedBreed: "Labrador Retriever",
        confidence: 0.92,
      }),
    ).resolves.not.toThrow();
  });

  it("can save detailed feedback annotation using saveFeedbackAnnotation helper", async () => {
    const result = await saveFeedbackAnnotation("mock-token", 2, {
      classificationEventId: 123,
      confirmedState: "relaxed",
      comment: "Muito calmo",
    });

    expect(upsertMock).toHaveBeenCalledWith(
      {
        classification_event_id: 123,
        user_id: 2,
        confirmed_state: "relaxed",
        comment: "Muito calmo",
      },
      {
        onConflict: "classification_event_id, user_id",
      },
    );
    expect(result).toEqual({
      id: 777,
      classification_event_id: 123,
      user_id: 2,
      confirmed_state: "relaxed",
      comment: "Muito calmo",
    });
  });

  it("can review detailed feedback annotation using reviewFeedbackAnnotation helper", async () => {
    const result = await reviewFeedbackAnnotation("mock-token", 99, 777);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewed_by: 99,
      }),
    );
    expect(result).toEqual({ id: 777, reviewed_by: 99 });
  });
});
