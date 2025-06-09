import { zodResolver } from "@hookform/resolvers/zod";
import { useRemixForm } from "remix-hook-form";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { RequiredLabelIcon } from "~/components/RequiredLabelIcon";
import { courseSchema } from "../schemas/courses";

const resolver = zodResolver(courseSchema);

type CourseFormProps = {
  course: {
    id: string;
    name: string;
    description: string;
  };
};

export function CourseForm({ course }: CourseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useRemixForm({
    resolver,
    defaultValues: {
      name: course.name,
      description: course.description,
    },
  });

  return (
    <Form
      method="POST"
      action={`/admin/courses/${course.id}/edit`}
      onSubmit={handleSubmit}
      className="flex gap-6 flex-col max-w-lg"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          <RequiredLabelIcon />
          Name
        </Label>
        <Input id="name" placeholder="Name" {...register("name")} />
        <p className="text-destructive">{errors.name?.message}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">
          <RequiredLabelIcon />
          Description
        </Label>
        <Textarea
          className="min-h-20 resize-none"
          placeholder="Description"
          {...register("description")}
        />
        <p className="text-destructive">{errors.description?.message}</p>
      </div>
      <div className="self-end">
        <Button type="submit" disabled={isSubmitting}>
          Save
        </Button>
      </div>
    </Form>
  );
}
