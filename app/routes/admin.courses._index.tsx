import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/PageHeader";
import { Link } from "react-router";
import { CourseTable } from "~/features/courses/components/CourseTable";
import { db } from "~/drizzle/db";
import {
  CourseSectionTable,
  CourseTable as DbCourseTable,
  LessonTable,
  UserCourseAccessTable,
} from "~/drizzle/schema";
import { asc, countDistinct, eq } from "drizzle-orm";
import type { Route } from "./+types/admin.courses._index";
import { getValidatedFormData } from "remix-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dataWithError, redirectWithSuccess } from "remix-toast";
import { deleteCourse } from "~/features/courses/db/courses";
import { deleteCourseSchema } from "~/features/courses/schemas/courses";

export const loader = async () => {
  const courses = await db
    .select({
      id: DbCourseTable.id,
      name: DbCourseTable.name,
      sectionsCount: countDistinct(CourseSectionTable),
      lessonsCount: countDistinct(LessonTable),
      studentsCount: countDistinct(UserCourseAccessTable),
    })
    .from(DbCourseTable)
    .leftJoin(
      CourseSectionTable,
      eq(CourseSectionTable.courseId, DbCourseTable.id)
    )
    .leftJoin(LessonTable, eq(LessonTable.sectionId, CourseSectionTable.id))
    .leftJoin(
      UserCourseAccessTable,
      eq(UserCourseAccessTable.courseId, DbCourseTable.id)
    )
    .orderBy(asc(DbCourseTable.name))
    .groupBy(DbCourseTable.id);

  return { courses };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const { errors, data } = await getValidatedFormData(request, zodResolver(deleteCourseSchema))

  if (errors) {
    return dataWithError(null, errors.courseId?.message || "Invalid Course Id")
  }
  await deleteCourse(data.courseId)
  return redirectWithSuccess("/admin/courses", "Course deleted successfully")
}

export default function CoursesPage({ loaderData }: Route.ComponentProps) {

  return (
    <div className="container my-6">
      <PageHeader title="Courses">
        <Button asChild>
          <Link to="/admin/courses/new">New Course</Link>
        </Button>
      </PageHeader>
      <CourseTable courses={loaderData.courses} />
    </div>
  );
}
