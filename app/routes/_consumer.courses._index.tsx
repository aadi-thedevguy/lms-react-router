import { and, countDistinct, eq } from "drizzle-orm";
import { getAuth } from "@clerk/react-router/ssr.server";
import { Link, redirect, Await } from "react-router";
import { Suspense } from "react";
import { db } from "~/drizzle/db";
import type { Route } from "./+types/_consumer.courses._index";
import {
  CourseSectionTable,
  CourseTable,
  LessonTable,
  UserCourseAccessTable,
  UserLessonCompleteTable,
} from "~/drizzle/schema";
import { wherePublicLessons } from "~/features/lessons/permissions/lessons";
import { wherePublicCourseSections } from "~/features/courseSections/permissions/sections";
import { PageHeader } from "~/components/PageHeader";
import {
  SkeletonArray,
  SkeletonButton,
  SkeletonText,
} from "~/components/Skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { formatPlural } from "~/lib/formatters";

export const loader = async (args: Route.LoaderArgs) => {
  const { sessionClaims } = await getAuth(args);

  if (!sessionClaims?.dbId) {
    return redirect("/sign-in");
  }

  const courses = getUserCourses(sessionClaims?.dbId);

  return { courses };
};

export default function CoursesPage({
  loaderData: { courses },
}: Route.ComponentProps) {
  return (
    <div className="container my-6">
      <PageHeader title="My Courses" />
      {/* <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"> */}
      <Suspense
        fallback={
          <SkeletonArray amount={3}>
            <SkeletonCourseCard />
          </SkeletonArray>
        }
      >
        <Await
          resolve={courses}
          errorElement={
            <div className="text-destructive">
              Failed to load courses. Please try again later.
            </div>
          }
        >
          {(courses) => (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {courses.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">No courses found.</p>
                  <Button asChild className="mt-4">
                    <Link to="/">Browse courses</Link>
                  </Button>
                </div>
              ) : (
                courses.map((course) => (
                  <Card className="overflow-hidden flex flex-col">
                    <CardHeader>
                      <CardTitle>{course.name}</CardTitle>
                      <CardDescription>
                        {formatPlural(course.sectionsCount, {
                          plural: "sections",
                          singular: "section",
                        })}{" "}
                        •{" "}
                        {formatPlural(course.lessonsCount, {
                          plural: "lessons",
                          singular: "lesson",
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent
                      className="line-clamp-3"
                      title={course.description}
                    >
                      {course.description}
                    </CardContent>
                    <div className="flex-grow" />
                    <CardFooter>
                      <Button asChild>
                        <Link to={`/courses/${course.id}`}>View Course</Link>
                      </Button>
                    </CardFooter>
                    <div
                      className="bg-accent h-2 -mt-2"
                      style={{
                        width: `${
                          (course.lessonsComplete /
                            (course.lessonsCount || 1)) *
                          100
                        }%`,
                      }}
                    />
                  </Card>
                ))
              )}
            </div>
          )}
        </Await>
      </Suspense>
    </div>
  );
}

function SkeletonCourseCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <SkeletonText className="w-3/4" />
        </CardTitle>
        <CardDescription>
          <SkeletonText className="w-1/2" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SkeletonText rows={3} />
      </CardContent>
      <CardFooter>
        <SkeletonButton />
      </CardFooter>
    </Card>
  );
}

async function getUserCourses(userId: string) {
  const courses = await db
    .select({
      id: CourseTable.id,
      name: CourseTable.name,
      description: CourseTable.description,
      sectionsCount: countDistinct(CourseSectionTable.id),
      lessonsCount: countDistinct(LessonTable.id),
      lessonsComplete: countDistinct(UserLessonCompleteTable.lessonId),
    })
    .from(CourseTable)
    .leftJoin(
      UserCourseAccessTable,
      and(
        eq(UserCourseAccessTable.courseId, CourseTable.id),
        eq(UserCourseAccessTable.userId, userId)
      )
    )
    .leftJoin(
      CourseSectionTable,
      and(
        eq(CourseSectionTable.courseId, CourseTable.id),
        wherePublicCourseSections
      )
    )
    .leftJoin(
      LessonTable,
      and(eq(LessonTable.sectionId, CourseSectionTable.id), wherePublicLessons)
    )
    .leftJoin(
      UserLessonCompleteTable,
      and(
        eq(UserLessonCompleteTable.lessonId, LessonTable.id),
        eq(UserLessonCompleteTable.userId, userId)
      )
    )
    .orderBy(CourseTable.name)
    .groupBy(CourseTable.id);

  return courses;
}
