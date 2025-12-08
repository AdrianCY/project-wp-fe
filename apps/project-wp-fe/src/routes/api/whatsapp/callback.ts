import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { whatsappBusinessAccounts, phoneNumbers } from "@/db/schema";
import { auth } from "@/lib/auth";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface CallbackRequestBody {
  code: string;
  accessToken?: string;
  organizationId: string;
}

interface DebugTokenResponse {
  data: {
    app_id: string;
    type: string;
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    scopes: string[];
    granular_scopes: Array<{
      scope: string;
      target_ids?: string[];
    }>;
    user_id: string;
  };
}

interface WABAResponse {
  id: string;
  name: string;
  currency: string;
  timezone_id: string;
  message_template_namespace: string;
}

interface PhoneNumberResponse {
  data: Array<{
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
  }>;
}

async function exchangeCodeForToken(code: string): Promise<string> {
  const appId = process.env.VITE_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Facebook app credentials not configured");
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?` +
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        code,
      })
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to exchange code for token");
  }

  const data = await response.json();
  return data.access_token;
}

async function getSharedWABAIds(accessToken: string): Promise<string[]> {
  const appId = process.env.VITE_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  // Debug the token to get shared WABA IDs
  const response = await fetch(
    `${GRAPH_API_BASE}/debug_token?` +
      new URLSearchParams({
        input_token: accessToken,
        access_token: `${appId}|${appSecret}`,
      })
  );

  if (!response.ok) {
    throw new Error("Failed to debug token");
  }

  const data: DebugTokenResponse = await response.json();
  
  // Extract WABA IDs from granular_scopes
  const wabaScope = data.data.granular_scopes?.find(
    (scope) => scope.scope === "whatsapp_business_management"
  );

  return wabaScope?.target_ids || [];
}

async function getWABADetails(
  wabaId: string,
  accessToken: string
): Promise<WABAResponse> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${wabaId}?` +
      new URLSearchParams({
        access_token: accessToken,
      })
  );

  if (!response.ok) {
    throw new Error("Failed to fetch WABA details");
  }

  return response.json();
}

async function getPhoneNumbers(
  wabaId: string,
  accessToken: string
): Promise<PhoneNumberResponse> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${wabaId}/phone_numbers?` +
      new URLSearchParams({
        access_token: accessToken,
      })
  );

  if (!response.ok) {
    throw new Error("Failed to fetch phone numbers");
  }

  return response.json();
}

async function subscribeWABAToWebhook(
  wabaId: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${wabaId}/subscribed_apps`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("Failed to subscribe WABA to webhook:", error);
    // Don't throw - this is non-critical for the signup flow
  }
}

export const Route = createFileRoute("/api/whatsapp/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Verify user is authenticated
          const session = await auth.api.getSession({
            headers: request.headers,
          });

          if (!session) {
            return new Response(
              JSON.stringify({ error: "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          const body: CallbackRequestBody = await request.json();
          const { code, accessToken: providedToken, organizationId } = body;

          if (!organizationId) {
            return new Response(
              JSON.stringify({ error: "Organization ID is required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Exchange code for access token if needed
          let accessToken = providedToken;
          if (code && !accessToken) {
            accessToken = await exchangeCodeForToken(code);
          }

          if (!accessToken) {
            return new Response(
              JSON.stringify({ error: "No access token available" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Get shared WABA IDs
          const wabaIds = await getSharedWABAIds(accessToken);

          if (wabaIds.length === 0) {
            return new Response(
              JSON.stringify({ error: "No WhatsApp Business Accounts shared" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const savedWABAs = [];

          // Process each WABA
          for (const wabaId of wabaIds) {
            // Get WABA details
            const wabaDetails = await getWABADetails(wabaId, accessToken);

            // Store WABA in database
            const [savedWABA] = await db
              .insert(whatsappBusinessAccounts)
              .values({
                organizationId,
                wabaId,
                name: wabaDetails.name,
                status: "connected",
                accessToken,
                metadata: {
                  currency: wabaDetails.currency,
                  timezone_id: wabaDetails.timezone_id,
                  message_template_namespace: wabaDetails.message_template_namespace,
                },
              })
              .onConflictDoUpdate({
                target: whatsappBusinessAccounts.wabaId,
                set: {
                  name: wabaDetails.name,
                  status: "connected",
                  accessToken,
                  updatedAt: new Date(),
                },
              })
              .returning();

            // Get and store phone numbers
            const phoneNumbersData = await getPhoneNumbers(wabaId, accessToken);

            for (const phone of phoneNumbersData.data) {
              await db
                .insert(phoneNumbers)
                .values({
                  wabaId: savedWABA.id,
                  phoneNumber: phone.display_phone_number.replace(/\D/g, ""),
                  displayPhoneNumber: phone.display_phone_number,
                  displayName: phone.verified_name,
                  qualityRating: phone.quality_rating?.toLowerCase() as
                    | "green"
                    | "yellow"
                    | "red"
                    | "unknown"
                    | undefined,
                  status: "verified",
                  phoneNumberId: phone.id,
                })
                .onConflictDoUpdate({
                  target: phoneNumbers.phoneNumberId,
                  set: {
                    displayPhoneNumber: phone.display_phone_number,
                    displayName: phone.verified_name,
                    qualityRating: phone.quality_rating?.toLowerCase() as
                      | "green"
                      | "yellow"
                      | "red"
                      | "unknown"
                      | undefined,
                    updatedAt: new Date(),
                  },
                });
            }

            // Subscribe WABA to webhooks
            await subscribeWABAToWebhook(wabaId, accessToken);

            savedWABAs.push(savedWABA);
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: "WhatsApp Business Account connected successfully",
              data: {
                wabaCount: savedWABAs.length,
                wabas: savedWABAs.map((w) => ({
                  id: w.id,
                  name: w.name,
                  wabaId: w.wabaId,
                })),
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (error) {
          console.error("WhatsApp callback error:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Internal server error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
