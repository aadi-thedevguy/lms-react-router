import { zodResolver } from "@hookform/resolvers/zod";
import { useRemixForm, getValidatedFormData } from "remix-hook-form";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/drizzle/db";
import { CourseTable } from "~/drizzle/schema";
import { PageHeader } from "~/components/PageHeader";
import { RequiredLabelIcon } from "~/components/RequiredLabelIcon";
import { courseSchema } from "~/features/courses/schemas/courses";
import { redirectWithSuccess } from "remix-toast";
import type { Route } from "./+types/admin.courses.new";
import { Label } from "~/components/ui/label";

const resolver = zodResolver(courseSchema);

export async function action({ request }: Route.ActionArgs) {
  const {
    errors,
    data: validatedData,
    receivedValues: defaultValues,
  } = await getValidatedFormData(request, resolver);

  if (errors) {
    return { errors, defaultValues };
  }

  await db.insert(CourseTable).values(validatedData).returning();

  return redirectWithSuccess(
    "/admin/courses/",
    "Course created successfully"
  );
}

export default function NewCoursePage() {
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    register,
  } = useRemixForm({
    resolver,
    defaultValues: {
      name: "",
      description: "",
    },
  });

  return (
    <div className="container my-6 mx-auto">
      <PageHeader title="New Course" />
      <Form
        method="POST"
        onSubmit={handleSubmit}
        className="flex gap-6 flex-col max-w-lg"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            <RequiredLabelIcon />
            Name
          </Label>
          <Input id="name" placeholder="Name" {...register("name")} />
          <p className="text-destructive">
            {errors.name && errors.name?.message}
          </p>
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
          <p className="text-destructive">
            {errors.description && errors.description?.message}
          </p>
        </div>

        <div className="self-end">
          <Button type="submit" disabled={isSubmitting}>
            Create
          </Button>
        </div>
      </Form>
    </div>
  );
}
