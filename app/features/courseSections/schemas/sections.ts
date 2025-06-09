import { courseSectionStatuses } from "~/drizzle/schema";
import { z } from "zod";

export const sectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  status: z.enum(courseSectionStatuses),
});

export const deleteSectionSchema = z.object({
  id: z.string().min(1),
});

export type SectionFormData = z.infer<typeof sectionSchema>;
