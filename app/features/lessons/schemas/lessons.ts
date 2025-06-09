import { lessonStatusEnum } from "~/drizzle/schema"
import { z } from "zod"

export const lessonSchema = z.object({
  lessonId: z.string().optional(),
  name: z.string().min(1),
  sectionId: z.string().min(1),
  status: z.enum(lessonStatusEnum.enumValues),
  youtubeVideoId: z.string().min(1),  
  description: z
    .string()
    .transform(v => (v === "" ? null : v))
    .nullable(),
})

export const deleteLessonSchema = z.object({
  lessonId: z.string().min(1),
})
