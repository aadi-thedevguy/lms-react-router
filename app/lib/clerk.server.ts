import { db } from "~/drizzle/db"
import { type UserRole, UserTable } from "~/drizzle/schema"
import { createClerkClient } from '@clerk/react-router/api.server'
import { eq } from "drizzle-orm"

export const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export function syncClerkUserMetadata(user: {
  id: string
  clerkUserId: string
  role: UserRole
}) {
  return clerkClient.users.updateUserMetadata(user.clerkUserId, {
    publicMetadata: {
      dbId: user.id,
      role: user.role,
    },
  })
}

export async function getUser(id: string) {
  return db.query.UserTable.findFirst({
    where: eq(UserTable.id, id),
  })
}
