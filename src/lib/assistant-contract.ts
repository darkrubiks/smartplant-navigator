import { z } from "zod";

export const AssistantInput = z.object({
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .min(1)
    .max(8),
  context: z.object({
    origin: z.string(),
    destinationId: z.string().nullable(),
    buildings: z.array(
      z.object({
        id: z.string(),
        number: z.string(),
        name: z.string(),
        category: z.string(),
        department: z.string().nullable(),
        keywords: z.array(z.string()),
      }),
    ),
  }),
});

const AssistantResponse = z.object({
  reply: z.string().min(1),
  navigateToBuildingId: z.string().nullable().default(null),
});

export function validateAssistantResponse(raw: unknown, buildings: Array<{ id: string }>) {
  const response = AssistantResponse.parse(raw);
  if (
    response.navigateToBuildingId &&
    !buildings.some((b) => b.id === response.navigateToBuildingId)
  ) {
    response.navigateToBuildingId = null;
  }
  return response;
}
