import { zodResolver } from "@hookform/resolvers/zod";
import { useRemixForm } from "remix-hook-form";
import { useFetcher } from "react-router";
import { lessonSchema } from "../schemas/lessons";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RequiredLabelIcon } from "~/components/RequiredLabelIcon";
import { type LessonStatus, lessonStatuses } from "~/drizzle/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { YouTubeVideoPlayer } from "./YouTubeVideoPlayer";
import { z } from "zod";

const resolver = zodResolver(lessonSchema);

export function LessonForm({
  sections,
  courseId,
  defaultSectionId,
  onSuccess,
  lesson,
}: {
  sections: {
    id: string;
    name: string;
  }[];
  courseId: string;
  onSuccess?: () => void;
  defaultSectionId?: string;
  lesson?: {
    id: string;
    name: string;
    status: LessonStatus;
    youtubeVideoId: string;
    description: string | null;
    sectionId: string;
  };
}) {
  const fetcher = useFetcher();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useRemixForm<z.infer<typeof lessonSchema>>({
    resolver,
    defaultValues: {
      name: lesson?.name ?? "",
      status: lesson?.status ?? "public",
      youtubeVideoId: lesson?.youtubeVideoId ?? "",
      description: lesson?.description ?? "",
      sectionId: lesson?.sectionId ?? defaultSectionId ?? sections[0]?.id ?? "",
      lessonId: lesson?.id,
    },
    fetcher,
    submitHandlers: {
      onValid: async (data) => {
        await fetcher.submit(data, {
          method: "POST",
          action: `/admin/courses/${courseId}/edit?action=${
            lesson ? "update-lesson" : "create-lesson"
          }`,
        });

        onSuccess?.();
      },
    },
  });

  const videoId = watch("youtubeVideoId");

  return (
    <fetcher.Form onSubmit={handleSubmit} className="flex gap-6 flex-col">
      {lesson && (
        <input type="hidden" id="lessonId" {...register("lessonId")} />
      )}
      <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            <RequiredLabelIcon />
            Name
          </Label>
          <Input id="name" placeholder="Name" {...register("name")} />
          <p className="text-destructive">{errors.name?.message}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="youtubeVideoId">
            <RequiredLabelIcon />
            YouTube Video Id
          </Label>
          <Input
            id="youtubeVideoId"
            placeholder="YouTube Video Id"
            {...register("youtubeVideoId")}
          />
          <p className="text-destructive">{errors.youtubeVideoId?.message}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Section</Label>
          <Select
            defaultValue={lesson?.sectionId ?? defaultSectionId}
            {...register("sectionId")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-destructive">{errors.sectionId?.message}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Select
            defaultValue={lesson?.status ?? "public"}
            {...register("status")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lessonStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-destructive">{errors.status?.message}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Description</Label>
        <Textarea
          className="min-h-20 resize-none"
          {...register("description")}
        />
        <p className="text-destructive">{errors.description?.message}</p>
      </div>
      <div className="self-end">
        <Button type="submit" disabled={fetcher.state !== "idle"}>
          {fetcher.state === "idle" ? "Save" : "Saving..."}
        </Button>
      </div>
      {videoId && (
        <div className="aspect-video">
          <YouTubeVideoPlayer videoId={videoId} />
        </div>
      )}
    </fetcher.Form>
  );
}
