import { z } from "zod"

export const courseSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
})

export const deleteCourseSchema = z.object({
  courseId: z.string().min(1),
})
