import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogTrigger,
} from "~/components/ui/dialog"
import { type CourseSectionStatus } from "~/drizzle/schema"
import { type ReactNode, useState } from "react"
import { SectionForm } from "./SectionForm"

type SectionFormDialogProps = {
  courseId: string;
  children: ReactNode;
  section?: { id: string; name: string; status: CourseSectionStatus };
};

export function SectionFormDialog({
  courseId,
  section,
  children,
}: SectionFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {section == null ? "New Section" : `Edit ${section.name}`}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <SectionForm
            section={section}
            courseId={courseId}
            onSuccess={() => setIsOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
