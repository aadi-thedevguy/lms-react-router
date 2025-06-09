import { getAuth } from "@clerk/react-router/ssr.server";
import { eq } from "drizzle-orm";
import { db } from "~/drizzle/db";
import { CourseProductTable, CourseTable } from "~/drizzle/schema";
import type { Route } from "./+types/_consumer.courses.$courseId._index";

export const loader = async (args: Route.LoaderArgs) => {
  const { userId } = await getAuth(args);
  
  const course = await getCourse(args.params.courseId);

  if (!course) {
    throw new Response("Course not found", { status: 404 });
  }

  // Check if user has purchased any product that includes this course
  let hasAccess = false;
  if (userId) {
    const purchase = await db.query.PurchaseTable.findFirst({
      where: (purchase, { eq, and, exists }) => 
        and(
          eq(purchase.userId, userId),
          exists(
            db
              .select()
              .from(CourseProductTable)
              .where(
                and(
                  eq(CourseProductTable.courseId, course.id),
                  eq(CourseProductTable.productId, purchase.productId)
                )
              )
          )
        )
    });
    hasAccess = !!purchase;
  }

  return { course, hasAccess };
};

export default function CoursePage({ loaderData }: Route.ComponentProps) {
  const { course, hasAccess } = loaderData;

  return (
    <div className="container py-8">
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold mb-4">{course.name}</h1>
          <div className="prose max-w-none">
            <p>{course.description}</p>
          </div>
          {/* <CourseContent 
            course={course} 
            hasAccess={hasAccess} 
          /> */}
        </div>
        <div className="md:col-span-1">
          {/* Course sidebar with instructor info, purchase button, etc. */}
        </div>
      </div>
    </div>
  );
}

async function getCourse(id: string) {

  return db.query.CourseTable.findFirst({
    columns: { id: true, name: true, description: true },
    where: eq(CourseTable.id, id),
  })
}