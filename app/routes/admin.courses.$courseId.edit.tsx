import { getValidatedFormData } from "remix-hook-form";
import type { Route } from "./+types/admin.courses.$courseId.edit";
import { courseSchema } from "~/features/courses/schemas/courses";
import {
  lessonSchema,
  deleteLessonSchema,
} from "~/features/lessons/schemas/lessons";
import {
  sectionSchema,
  deleteSectionSchema,
} from "~/features/courseSections/schemas/sections";
import { PageHeader } from "~/components/PageHeader";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DialogTrigger } from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { db } from "~/drizzle/db";
import { CourseSectionTable, CourseTable, LessonTable } from "~/drizzle/schema";
import { CourseForm } from "~/features/courses/components/CourseForm";
import { SectionFormDialog } from "~/features/courseSections/components/SectionFormDialog";
import { SortableSectionList } from "~/features/courseSections/components/SortableSectionList";
import {
  dataWithError,
  dataWithSuccess,
  redirectWithSuccess,
} from "remix-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { SortableLessonList } from "~/features/lessons/components/SortableLessonList";
import { LessonFormDialog } from "~/features/lessons/components/LessonFormDialog";
import { cn } from "~/lib/utils";
import { EyeClosed, PlusIcon } from "lucide-react";
import { asc, eq, param } from "drizzle-orm";
import { updateCourse } from "~/features/courses/db/courses";
import {
  deleteSection,
  getNextCourseSectionOrder,
  insertSection,
  updateSection,
  updateSectionOrders,
} from "~/features/courseSections/db/sections";
import {
  canCreateCourseSections,
  canUpdateCourseSections,
  canDeleteCourseSections,
} from "~/features/courseSections/permissions/sections";
import {
  canCreateLessons,
  canUpdateLessons,
  canDeleteLessons,
} from "~/features/lessons/permissions/lessons";
import { canUpdateCourses } from "~/features/courses/permissions/courses";
import { getAuth } from "@clerk/react-router/ssr.server";
import { getUser } from "~/lib/clerk.server";
import {
  deleteLesson,
  getNextCourseLessonOrder,
  insertLesson,
  updateLesson,
  updateLessonOrders,
} from "~/features/lessons/db/lessons";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const course = await getCourse(params.courseId);

  if (!course) {
    throw new Response("Course not found", { status: 404 });
  }

  const { sessionClaims } = await getAuth({ request, params, context });

  if (!sessionClaims?.dbId) {
    throw new Response("User not found", { status: 404 });
  }

  const user = await getUser(sessionClaims.dbId);

  if (!user || !canUpdateCourses(user)) {
    throw new Response("You are not authorized to update this course", {
      status: 403,
    });
  }

  return { course };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";
  const { sessionClaims } = await getAuth({ request, params, context });

  if (!sessionClaims?.dbId) {
    throw new Response("User not found", { status: 404 });
  }

  const user = await getUser(sessionClaims.dbId);

  try {
    switch (action) {
      case "create-section": {
        if (!user || !canCreateCourseSections(user)) {
          return dataWithError(
            null,
            "You do not have permission to create course sections"
          );
        }

        const {
          errors,
          data: validatedData,
          receivedValues: defaultValues,
        } = await getValidatedFormData(request, zodResolver(sectionSchema));

        if (errors) {
          return { errors, defaultValues };
        }
        const order = await getNextCourseSectionOrder(params.courseId);

        await insertSection({
          name: validatedData.name,
          status: validatedData.status,
          courseId: params.courseId,
          order,
        });

        return redirectWithSuccess(
          url.pathname,
          "Section created successfully"
        );
      }

      case "update-section": {
        if (!user || !canUpdateCourseSections(user)) {
          return dataWithError(
            null,
            "You do not have permission to update course sections"
          );
        }

        const {
          errors,
          data: validatedData,
          receivedValues: defaultValues,
        } = await getValidatedFormData(request, zodResolver(sectionSchema));

        if (errors) {
          return { errors, defaultValues };
        }

        if (!validatedData.id) {
          return dataWithError(null, "Section ID is required");
        }

        await updateSection(validatedData);

        return redirectWithSuccess(
          url.pathname,
          "Section updated successfully"
        );
      }

      case "update-section-order": {
        if (!user || !canUpdateCourseSections(user)) {
          return dataWithError(
            null,
            "You do not have permission to update course sections"
          );
        }

        const formData = await request.formData();
        const order = JSON.parse(formData.get("order") as string) as string[];
        if (!Array.isArray(order)) {
          return dataWithError(null, "Invalid order data");
        }

        await updateSectionOrders(order);

        // return dataWithSuccess(null, "Section order updated successfully");
      }

      case "delete-section": {
        if (!user || !canDeleteCourseSections(user)) {
          return dataWithError(
            null,
            "You do not have permission to delete a course section"
          );
        }
        const { errors, data: validatedData } = await getValidatedFormData(
          request,
          zodResolver(deleteSectionSchema)
        );

        if (errors) {
          return { errors, defaultValues: validatedData };
        }

        await deleteSection(validatedData.id);

        return redirectWithSuccess(
          url.pathname,
          "Section deleted successfully"
        );
      }

      case "create-lesson": {
        if (!user || !canCreateLessons(user)) {
          return dataWithError(
            null,
            "You do not have permission to create lessons"
          );
        }

        const { errors, data: validatedData } = await getValidatedFormData(
          request,
          zodResolver(lessonSchema)
        );

        if (errors) {
          return { errors, defaultValues: validatedData };
        }

        const order = await getNextCourseLessonOrder(validatedData.sectionId);

        await insertLesson({ ...validatedData, order });

        return dataWithSuccess(null, "Lesson created successfully");
      }

      case "update-lesson": {
        if (!user || !canUpdateLessons(user)) {
          return dataWithError(
            null,
            "You do not have permission to update lessons"
          );
        }

        const { errors, data: validatedData } = await getValidatedFormData(
          request,
          zodResolver(lessonSchema)
        );

        if (errors) {
          return { errors, defaultValues: validatedData };
        }

        if (!validatedData.lessonId) {
          return dataWithError(null, "Lesson ID is required");
        }

        await updateLesson(validatedData.lessonId, validatedData);

        return dataWithSuccess(null, "Lesson updated successfully");
      }

      case "delete-lesson": {
        if (!user || !canDeleteLessons(user)) {
          return dataWithError(
            null,
            "You do not have permission to delete lessons"
          );
        }

        const { errors, data: validatedData } = await getValidatedFormData(
          request,
          zodResolver(deleteLessonSchema)
        );
        if (errors) {
          return { errors, defaultValues: validatedData };
        }

        await deleteLesson(validatedData.lessonId);

        return redirectWithSuccess(url.pathname, "Lesson deleted successfully");
      }

      case "update-lesson-order": {
        if (!user || !canUpdateLessons(user)) {
          return dataWithError(
            null,
            "You do not have permission to update lesson order"
          );
        }

        const formData = await request.formData();
        const order = JSON.parse(formData.get("order") as string) as string[];
        if (!Array.isArray(order)) {
          return dataWithError(null, "Invalid order data");
        }

        await updateLessonOrders(order);

        // return dataWithSuccess(null, "Lesson order updated successfully");
      }

      default:
        const {
          errors,
          data: validatedData,
          receivedValues: defaultValues,
        } = await getValidatedFormData(request, zodResolver(courseSchema));

        if (errors) {
          return { errors, defaultValues };
        }

        if (!user || !canUpdateCourses(user)) {
          return dataWithError(
            null,
            "You do not have permission to modify courses"
          );
        }

        await updateCourse(params.courseId, validatedData);

        return dataWithSuccess(null, "Course updated successfully");
    }
  } catch (error) {
    console.error("Action error:", error);
    throw error;
    // return dataWithError(
    //   null,
    //   "An error occurred while processing your request"
    // );
  }
}

export default function EditCoursePage({
  loaderData: { course },
}: Route.ComponentProps) {
  return (
    <div className="container my-6">
      <PageHeader title={course.name} />
      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="lessons" className="flex flex-col gap-2">
          <Card>
            <CardHeader className="flex items-center flex-row justify-between">
              <CardTitle>Sections</CardTitle>
              <SectionFormDialog courseId={course.id}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <PlusIcon /> New Section
                  </Button>
                </DialogTrigger>
              </SectionFormDialog>
            </CardHeader>
            <CardContent>
              <SortableSectionList
                courseId={course.id}
                sections={course.courseSections}
              />
            </CardContent>
          </Card>
          <hr className="my-2" />
          {course.courseSections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="flex items-center flex-row justify-between gap-4">
                <CardTitle
                  className={cn(
                    "flex items-center gap-2",
                    section.status === "private" && "text-muted-foreground"
                  )}
                >
                  {section.status === "private" && <EyeClosed />} {section.name}
                </CardTitle>
                <div className="flex gap-2">
                  <SectionFormDialog courseId={course.id} section={section}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </SectionFormDialog>
                  <LessonFormDialog
                    courseId={course.id}
                    defaultSectionId={section.id}
                    sections={course.courseSections}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <PlusIcon className="h-4 w-4" /> New Lesson
                      </Button>
                    </DialogTrigger>
                  </LessonFormDialog>
                </div>
              </CardHeader>
              <CardContent>
                <SortableLessonList
                  sections={course.courseSections}
                  lessons={section.lessons}
                  courseId={course.id}
                />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CourseForm course={course} />
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function getCourse(id: string) {
  return db.query.CourseTable.findFirst({
    columns: { id: true, name: true, description: true },
    where: eq(CourseTable.id, id),
    with: {
      courseSections: {
        orderBy: asc(CourseSectionTable.order),
        columns: { id: true, status: true, name: true },
        with: {
          lessons: {
            orderBy: asc(LessonTable.order),
            columns: {
              id: true,
              name: true,
              status: true,
              description: true,
              youtubeVideoId: true,
              sectionId: true,
            },
          },
        },
      },
    },
  });
}
