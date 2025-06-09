import { redirect } from "react-router"
import { getAuth } from "@clerk/react-router/ssr.server"
import { insertUser } from "~/features/users/db/users"
import { clerkClient, syncClerkUserMetadata } from "~/lib/clerk.server"
import type { Route } from "./+types/api.clerk.sync-users"
import { data } from "react-router"

export async function loader(args: Route.LoaderArgs) {
  console.group("🔄 Sync Users Loader")
  console.time("Total Sync Time")
  
  try {
    console.log("📍 Step 1: Getting user authentication")
    const { userId } = await getAuth(args)
    console.log("👤 User ID:", userId || "Not authenticated")

    if (!userId) {
      console.warn("❌ Authentication failed - redirecting to sign in")
      console.groupEnd()
      return redirect("/sign-in?redirect_url=" + args.request.url)
    }

    console.log("📍 Step 2: Fetching Clerk user details")
    console.time("Clerk User Fetch")
    const user = await clerkClient.users.getUser(userId)
    console.timeEnd("Clerk User Fetch")
    console.log("📋 User details:", {
      id: user?.id,
      fullName: user?.fullName,
      username: user?.username,
      email: user?.primaryEmailAddress?.emailAddress,
      hasImage: !!user?.imageUrl
    })

    if (!user) {
      console.error("❌ User not found in Clerk")
      console.groupEnd()
      throw data({ message: "User not found" }, { status: 500 })
    }
    if (!user.fullName && !user.username) {
      console.error("❌ Missing user name", { fullName: user.fullName, username: user.username })
      console.groupEnd()
      throw data({ message: "User name missing" }, { status: 500 })
    }
    if (!user.primaryEmailAddress?.emailAddress) {
      console.error("❌ Missing email address")
      console.groupEnd()
      throw data({ message: "User email missing" }, { status: 500 })
    }

    console.log("📍 Step 3: Inserting/updating user in database")
    console.time("DB Operation")
    const dbUser = await insertUser({
      clerkUserId: user.id,
      name: user.fullName ?? user.username ?? "",
      email: user.primaryEmailAddress.emailAddress,
      imageUrl: user.imageUrl,
      role: user.publicMetadata.role ?? "user",
    })
    console.timeEnd("DB Operation")
    console.log("💾 Database user:", dbUser)

    console.log("📍 Step 4: Syncing Clerk metadata")
    console.time("Metadata Sync")
    await syncClerkUserMetadata(dbUser)
    console.timeEnd("Metadata Sync")

    console.log("📍 Step 5: Adding delay for sync stability")
    await new Promise(res => setTimeout(res, 100))

    console.log("✅ Sync completed successfully")
    console.timeEnd("Total Sync Time")
    console.groupEnd()
    
    return redirect("/")
  } catch (error) {
    console.error("❌ Unexpected error in sync process:", error)
    console.groupEnd()
    throw error
  }
}
