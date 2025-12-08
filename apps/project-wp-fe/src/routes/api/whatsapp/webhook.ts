import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import {
  whatsappBusinessAccounts,
  phoneNumbers,
  contacts,
  conversations,
  messages,
} from "@/db/schema";

// Webhook payload types
interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

interface WebhookChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: Array<{
      profile: { name: string };
      wa_id: string;
    }>;
    messages?: Array<WebhookMessage>;
    statuses?: Array<WebhookStatus>;
  };
  field: string;
}

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string };
  document?: { id: string; filename: string; mime_type: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: Array<{
    name: { formatted_name: string };
    phones: Array<{ phone: string }>;
  }>;
  interactive?: { type: string; [key: string]: unknown };
  button?: { text: string; payload: string };
  reaction?: { message_id: string; emoji: string };
}

interface WebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

async function processIncomingMessage(
  change: WebhookChange,
  wabaEntry: typeof whatsappBusinessAccounts.$inferSelect,
  phoneNumberEntry: typeof phoneNumbers.$inferSelect
) {
  const { contacts: waContacts, messages: waMessages } = change.value;

  if (!waMessages || waMessages.length === 0) return;

  for (const message of waMessages) {
    const waContact = waContacts?.find((c) => c.wa_id === message.from);

    // Find or create contact
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.organizationId, wabaEntry.organizationId),
        eq(contacts.phoneNumber, message.from)
      ),
    });

    if (!contact) {
      const [newContact] = await db
        .insert(contacts)
        .values({
          organizationId: wabaEntry.organizationId,
          phoneNumber: message.from,
          waId: message.from,
          name: waContact?.profile?.name || null,
        })
        .returning();
      contact = newContact;
    } else if (waContact?.profile?.name && !contact.name) {
      // Update contact name if we didn't have it
      await db
        .update(contacts)
        .set({ name: waContact.profile.name, updatedAt: new Date() })
        .where(eq(contacts.id, contact.id));
    }

    // Find or create conversation
    let conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.contactId, contact.id),
        eq(conversations.phoneNumberId, phoneNumberEntry.id)
      ),
    });

    const messageTimestamp = new Date(Number.parseInt(message.timestamp) * 1000);
    const windowExpiry = new Date(messageTimestamp.getTime() + 24 * 60 * 60 * 1000);

    if (!conversation) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          organizationId: wabaEntry.organizationId,
          contactId: contact.id,
          phoneNumberId: phoneNumberEntry.id,
          lastMessageAt: messageTimestamp,
          windowExpiresAt: windowExpiry,
          isOpen: true,
        })
        .returning();
      conversation = newConversation;
    } else {
      // Update conversation
      await db
        .update(conversations)
        .set({
          lastMessageAt: messageTimestamp,
          windowExpiresAt: windowExpiry,
          isOpen: true,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversation.id));
    }

    // Determine message type
    const messageType = message.type as
      | "text"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "sticker"
      | "location"
      | "contacts"
      | "interactive"
      | "reaction"
      | "unknown";

    // Build message content based on type
    let content: Record<string, unknown> = {};
    switch (message.type) {
      case "text":
        content = { body: message.text?.body };
        break;
      case "image":
        content = { ...message.image };
        break;
      case "video":
        content = { ...message.video };
        break;
      case "audio":
        content = { ...message.audio };
        break;
      case "document":
        content = { ...message.document };
        break;
      case "location":
        content = { ...message.location };
        break;
      case "contacts":
        content = { contacts: message.contacts };
        break;
      case "interactive":
        content = { ...message.interactive };
        break;
      case "reaction":
        content = { ...message.reaction };
        break;
      case "button":
        content = { ...message.button };
        break;
      default:
        content = { raw: message };
    }

    // Store the message
    await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        wamid: message.id,
        direction: "inbound",
        type: messageType,
        content,
        status: "delivered",
        sentAt: messageTimestamp,
        deliveredAt: messageTimestamp,
      })
      .onConflictDoNothing();
  }
}

async function processStatusUpdate(change: WebhookChange) {
  const { statuses } = change.value;

  if (!statuses || statuses.length === 0) return;

  for (const status of statuses) {
    const updateData: Record<string, unknown> = {
      status: status.status,
      updatedAt: new Date(),
    };

    const timestamp = new Date(Number.parseInt(status.timestamp) * 1000);

    switch (status.status) {
      case "sent":
        updateData.sentAt = timestamp;
        break;
      case "delivered":
        updateData.deliveredAt = timestamp;
        break;
      case "read":
        updateData.readAt = timestamp;
        break;
      case "failed":
        updateData.failedAt = timestamp;
        if (status.errors?.[0]) {
          updateData.errorCode = String(status.errors[0].code);
          updateData.errorMessage = status.errors[0].title;
        }
        break;
    }

    await db
      .update(messages)
      .set(updateData)
      .where(eq(messages.wamid, status.id));
  }
}

export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: {
      // Webhook verification (required by Meta)
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

        if (mode === "subscribe" && token === verifyToken) {
          console.log("Webhook verified successfully");
          return new Response(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        console.log("Webhook verification failed");
        return new Response("Forbidden", { status: 403 });
      },

      // Receive webhook events
      POST: async ({ request }) => {
        try {
          const payload: WebhookPayload = await request.json();

          // Verify this is a WhatsApp webhook
          if (payload.object !== "whatsapp_business_account") {
            return new Response("OK", { status: 200 });
          }

          // Process each entry
          for (const entry of payload.entry) {
            const wabaId = entry.id;

            // Find the WABA in our database
            const waba = await db.query.whatsappBusinessAccounts.findFirst({
              where: eq(whatsappBusinessAccounts.wabaId, wabaId),
            });

            if (!waba) {
              console.log(`Unknown WABA: ${wabaId}`);
              continue;
            }

            for (const change of entry.changes) {
              if (change.field !== "messages") continue;

              const phoneNumberId = change.value.metadata.phone_number_id;

              // Find the phone number
              const phoneNumber = await db.query.phoneNumbers.findFirst({
                where: eq(phoneNumbers.phoneNumberId, phoneNumberId),
              });

              if (!phoneNumber) {
                console.log(`Unknown phone number: ${phoneNumberId}`);
                continue;
              }

              // Process messages
              if (change.value.messages) {
                await processIncomingMessage(change, waba, phoneNumber);
              }

              // Process status updates
              if (change.value.statuses) {
                await processStatusUpdate(change);
              }
            }
          }

          // Always respond with 200 OK quickly
          return new Response("OK", { status: 200 });
        } catch (error) {
          console.error("Webhook processing error:", error);
          // Still return 200 to prevent retries for malformed payloads
          return new Response("OK", { status: 200 });
        }
      },
    },
  },
});
