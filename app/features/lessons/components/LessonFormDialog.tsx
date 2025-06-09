import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "~/components/ui/dialog"
import { type LessonStatus } from "~/drizzle/schema"
import { type ReactNode, useState } from "react"
import { LessonForm } from "./LessonForm"

export function LessonFormDialog({
  sections,
  courseId,
  defaultSectionId,
  lesson,
  children,
}: {
  children: ReactNode
  sections: { id: string; name: string }[]
  courseId: string
  defaultSectionId?: string
  lesson?: {
    id: string
    name: string
    status: LessonStatus
    youtubeVideoId: string
    description: string | null
    sectionId: string
  }
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children}
      <DialogContent className="max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lesson == null ? "New Lesson" : `Edit ${lesson.name}`}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <LessonForm
            sections={sections}
            courseId={courseId}
            lesson={lesson}
            defaultSectionId={defaultSectionId}
            onSuccess={() => setIsOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
