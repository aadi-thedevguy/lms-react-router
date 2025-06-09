import { deleteUser, insertUser, updateUser } from "~/features/users/db/users"
import { syncClerkUserMetadata } from "~/lib/clerk.server"
import { Webhook } from "svix"
import type { WebhookEvent } from "@clerk/react-router/api.server"
import {data} from "react-router"
import type { Route } from "./+types/api.webhooks.clerk"

export async function action({ request }: Route.ActionArgs) {
  console.log("🎯 Webhook Request Received:", new Date().toISOString())

  // 🔍 Validate HTTP method
  if (request.method !== "POST") {
    console.log("❌ Invalid Method:", request.method)
    return data({ message: "Method not allowed" }, { status: 405 })
  }

  // 📝 Extract Svix headers for webhook verification
  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  console.log("🔐 Webhook Headers:", {
    svixId,
    svixTimestamp,
    hasSignature: !!svixSignature,
  })

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("❌ Missing Svix Headers")
    return data({ message: "Error occurred -- no svix headers" }, { status: 400 })
  }

  // 📦 Get and parse webhook payload
  const payload = await request.json()
  const body = JSON.stringify(payload)
  console.log("📥 Received Webhook Type:", payload.type)

  // ✅ Verify webhook signature
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
  let event: WebhookEvent

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent
    console.log("✅ Webhook Verified Successfully")
  } catch (err) {
    console.error("🚨 Webhook Verification Failed:", err)
    return data({ message: "Error occurred" }, { status: 400 })
  }

  // 🔄 Process different webhook events
  switch (event.type) {
    case "user.created":
    case "user.updated": {
      console.log(`👤 Processing ${event.type} Event for User:`, event.data.id)
      
      const email = event.data.email_addresses.find(
        email => email.id === event.data.primary_email_address_id
      )?.email_address
      const name = (event.data.first_name && event.data.last_name) 
        ? `${event.data.first_name} ${event.data.last_name}`.trim() 
        : event.data.username

      console.log("📧 User Details:", { email, name, userId: event.data.id })
      
      if (email == null) {
        console.error("❌ No Email Found for User:", event.data.id)
        return data({ message: "No email" }, { status: 400 })
      }
      if (!name) {
        console.error("❌ No Name Found for User:", event.data.id)
        return data({ message: "No name" }, { status: 400 })
      }

      if (event.type === "user.created") {
        console.log("🆕 Creating New User in Database")
        const user = await insertUser({
          clerkUserId: event.data.id,
          email,
          name,
          imageUrl: event.data.image_url,
          role: "user",
        })

        await syncClerkUserMetadata(user)
        console.log("✨ New User Created Successfully:", user)
      } else {
        console.log("📝 Updating Existing User:", event.data.id)
        await updateUser(
          { clerkUserId: event.data.id },
          {
            email,
            name,
            imageUrl: event.data.image_url,
            role: event.data.public_metadata.role,
          }
        )
        console.log("✅ User Updated Successfully")
      }
      break
    }
    case "user.deleted": {
      console.log("🗑️ Processing User Deletion:", event.data.id)
      if (event.data.id != null) {
        await deleteUser({ clerkUserId: event.data.id })
        console.log("✅ User Deleted Successfully")
      }
      break
    }
  }

  console.log("🎉 Webhook Processed Successfully")
  return data({ message: "Success" }, { status: 200 })
}
