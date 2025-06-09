import { zodResolver } from "@hookform/resolvers/zod";
import { useRemixForm } from "remix-hook-form";
import { useFetcher } from "react-router";
import { sectionSchema, type SectionFormData } from "../schemas/sections";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RequiredLabelIcon } from "~/components/RequiredLabelIcon";
import { type CourseSectionStatus } from "~/drizzle/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const resolver = zodResolver(sectionSchema);

interface SectionFormProps {
  section?: {
    id: string;
    name: string;
    status: CourseSectionStatus;
  };
  courseId: string;
  onSuccess?: () => void;
}

export function SectionForm({
  section,
  courseId,
  onSuccess,
}: SectionFormProps) {
  const fetcher = useFetcher();
  const {
    register,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useRemixForm<SectionFormData>({
    resolver,
    defaultValues: {
      name: section?.name ?? "",
      status: section?.status ?? "private",
    },
    fetcher,
    submitHandlers: {
      onValid: async (data) => {
        await fetcher.submit(data, {
          method: "POST",
          action:
            section == null
              ? `/admin/courses/${courseId}/edit?action=create-section`
              : `/admin/courses/${courseId}/edit?action=update-section`,
        });
        onSuccess?.();
      },
    },
  });

  return (
    <fetcher.Form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label>
          <RequiredLabelIcon />
          Name
        </Label>
        <Input id="name" placeholder="Name" {...register("name")} />
        {errors.name && (
          <p className="text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Status</Label>
        <Select
          defaultValue={section?.status ?? "private"}
          {...register("status")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && (
          <p className="text-destructive">{errors.status.message}</p>
        )}
      </div>
      {section?.id && <input type="hidden" {...register("id")} value={section.id} />}
      <div className="self-end">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? section == null
              ? "Creating..."
              : "Updating..."
            : section == null
            ? "Create"
            : "Update"}
        </Button>
      </div>
    </fetcher.Form>
  );
}
