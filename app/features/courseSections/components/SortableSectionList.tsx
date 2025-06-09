import { type CourseSectionStatus } from "~/drizzle/schema";
import { useFetcher } from "react-router";
import { cn } from "~/lib/utils";
import { EyeClosed, Trash2Icon } from "lucide-react";
import { SortableItem, SortableList } from "~/components/SortableList";
import { SectionFormDialog } from "./SectionFormDialog";
import { Button } from "~/components/ui/button";
import { ActionButton } from "~/components/ActionButton";
import { DialogTrigger } from "~/components/ui/dialog";

export function SortableSectionList({
  sections,
  courseId,
}: {
  sections: Array<{
    id: string;
    name: string;
    status: CourseSectionStatus;
  }>;
  courseId: string;
}) {
  const fetcher = useFetcher();

  const handleOrderChange = async (newOrder: string[]) => {
    // Only send the IDs in the new order
    await fetcher.submit(
      { order: JSON.stringify(newOrder) },
      {
        method: "POST",
        action: `/admin/courses/${courseId}/edit?action=update-section-order`,
      }
    );
    return { error: false, message: "Section order updated" };
  };

  return (
    <SortableList items={sections} onOrderChange={handleOrderChange}>
      {(items) =>
        items.map((section) => (
          <SortableItem
            key={section.id}
            id={section.id}
            className="flex items-center justify-between"
          >
            <div
              className={cn(
                "flex items-center gap-2",
                section.status === "private" && "text-muted-foreground"
              )}
            >
              {section.status === "private" && <EyeClosed />} {section.name}
            </div>
            {/* Edit Section Dialog */}
            <SectionFormDialog section={section} courseId={courseId}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                  Edit
                </Button>
              </DialogTrigger>
            </SectionFormDialog>
            <ActionButton
              variant="destructiveOutline"
              size="icon"
              formAction={`/admin/courses/${courseId}/edit?action=delete-section`}
              formData={{ id: section.id }}
              formMethod="post"
              requireAreYouSure
            >
              <Trash2Icon className="size-4" />
            </ActionButton>
          </SortableItem>
        ))
      }
    </SortableList>
  );
}
