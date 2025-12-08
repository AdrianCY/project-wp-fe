import { createFileRoute } from "@tanstack/react-router";
import {
  type WebhookPayload,
  type MessageChangeValue,
  type AccountUpdateValue,
  type AccountReviewUpdateValue,
  type PhoneNumberNameUpdateValue,
  type PhoneNumberQualityUpdateValue,
  handleIncomingMessages,
  handleStatusUpdates,
  handleAccountUpdate,
  handleAccountReviewUpdate,
  handlePhoneNumberNameUpdate,
  handlePhoneNumberQualityUpdate,
} from "@/server/webhooks";

export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: {
      // Webhook verification (required by Meta)
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
          console.log("[Webhook] Verified successfully");
          return new Response(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        console.warn("[Webhook] Verification failed");
        return new Response("Forbidden", { status: 403 });
      },

      // Receive webhook events
      POST: async ({ request }) => {
        try {
          const payload: WebhookPayload = await request.json();

          if (payload.object !== "whatsapp_business_account") {
            return new Response("OK", { status: 200 });
          }

          for (const entry of payload.entry) {
            const wabaId = entry.id;

            for (const change of entry.changes) {
              await processChange(wabaId, change.field, change.value);
            }
          }

          return new Response("OK", { status: 200 });
        } catch (error) {
          console.error("[Webhook] Error:", error);
          return new Response("OK", { status: 200 });
        }
      },
    },
  },
});

/**
 * Route webhook changes to appropriate handlers
 */
async function processChange(wabaId: string, field: string, value: unknown) {
  switch (field) {
    case "messages": {
      const msgValue = value as MessageChangeValue;
      if (msgValue.messages?.length) {
        await handleIncomingMessages(wabaId, msgValue);
      }
      if (msgValue.statuses?.length) {
        await handleStatusUpdates(msgValue.statuses);
      }
      break;
    }

    case "account_update":
      await handleAccountUpdate(wabaId, value as AccountUpdateValue);
      break;

    case "account_review_update":
      await handleAccountReviewUpdate(wabaId, value as AccountReviewUpdateValue);
      break;

    case "phone_number_name_update":
      await handlePhoneNumberNameUpdate(wabaId, value as PhoneNumberNameUpdateValue);
      break;

    case "phone_number_quality_update":
      await handlePhoneNumberQualityUpdate(wabaId, value as PhoneNumberQualityUpdateValue);
      break;

    default:
      console.log(`[Webhook] Unhandled field: ${field}`);
  }
}
