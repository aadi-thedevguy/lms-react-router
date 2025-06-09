import { useFetcher } from "react-router";
import { SortableItem, SortableList } from "~/components/SortableList";
import { ActionButton } from "~/components/ActionButton";
import { Button } from "~/components/ui/button";
import { type LessonStatus } from "~/drizzle/schema";
import { EyeClosed, Trash2Icon, VideoIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { DialogTrigger } from "~/components/ui/dialog";
import { LessonFormDialog } from "./LessonFormDialog";

export function SortableLessonList({
  sections,
  lessons,
  courseId,
}: {
  sections: {
    id: string;
    name: string;
  }[];
  lessons: {
    id: string;
    name: string;
    status: LessonStatus;
    youtubeVideoId: string;
    description: string | null;
    sectionId: string;
  }[];
  courseId: string;
}) {
  const fetcher = useFetcher();

  const handleOrderChange = async (newOrder: string[]) => {
    // Only send the lesson IDs in the new order
    await fetcher.submit(
      { 
        order: JSON.stringify(newOrder),
        sectionId: lessons[0]?.sectionId // Include section ID for validation
      },
      { 
        method: "POST", 
        action: `/admin/courses/${courseId}/edit?action=update-lesson-order` 
      }
    );
    return { error: false, message: "Lesson order updated" };
  };

  return (
    <SortableList items={lessons} onOrderChange={handleOrderChange}>
      {(items) =>
        items.map((lesson) => (
          <SortableItem
            key={lesson.id}
            id={lesson.id}
            className="flex items-center justify-between"
          >
            <div
              className={cn(
                "flex items-center gap-2",
                lesson.status === "private" && "text-muted-foreground"
              )}
            >
              {lesson.status === "private" && <EyeClosed />}
              {lesson.name}
              {lesson.youtubeVideoId && <VideoIcon className="size-4" />}
            </div>
            <div className="flex gap-2">
              <LessonFormDialog 
                lesson={lesson} 
                sections={sections} 
                courseId={courseId} 
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    Edit
                  </Button>
                </DialogTrigger>
              </LessonFormDialog>
              <ActionButton
                variant="destructiveOutline"
                size="icon"
                formAction={`/admin/courses/${courseId}/edit?action=delete-lesson`}
                formData={{ lessonId: lesson.id }}
                formMethod="post"
                requireAreYouSure
              >
                <Trash2Icon className="size-4" />
              </ActionButton>
            </div>
          </SortableItem>
        ))
      }
    </SortableList>
  );
}