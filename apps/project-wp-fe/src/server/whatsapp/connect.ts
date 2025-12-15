import { createServerFn } from "@tanstack/react-start";
import { phoneNumbers, whatsappBusinessAccounts } from "wp-db";
import { db } from "@/db";
import {
	GRAPH_API_BASE,
	getFacebookAppCredentials,
	getSystemAccessToken,
} from "@/lib/facebook-api";
import { authMiddleware } from "@/server/middleware/auth";

// Response types
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

// Helper functions
async function exchangeCodeForToken(code: string): Promise<string> {
	const { appId, appSecret } = getFacebookAppCredentials();

	const response = await fetch(
		`${GRAPH_API_BASE}/oauth/access_token?` +
			new URLSearchParams({
				client_id: appId,
				client_secret: appSecret,
				code,
			}),
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(
			error.error?.message || "Failed to exchange code for token",
		);
	}

	const data = await response.json();
	const shortLivedToken = data.access_token;

	return exchangeForLongLivedToken(shortLivedToken);
}

async function exchangeForLongLivedToken(
	shortLivedToken: string,
): Promise<string> {
	try {
		const { appId, appSecret } = getFacebookAppCredentials();

		const response = await fetch(
			`${GRAPH_API_BASE}/oauth/access_token?` +
				new URLSearchParams({
					grant_type: "fb_exchange_token",
					client_id: appId,
					client_secret: appSecret,
					fb_exchange_token: shortLivedToken,
				}),
		);

		if (!response.ok) {
			console.warn(
				"Failed to exchange for long-lived token, using short-lived",
			);
			return shortLivedToken;
		}

		const data = await response.json();
		return data.access_token;
	} catch (error) {
		console.warn("Failed to exchange for long-lived token:", error);
		return shortLivedToken;
	}
}

async function getSharedWABAIds(accessToken: string): Promise<string[]> {
	const { appId, appSecret } = getFacebookAppCredentials();

	const response = await fetch(
		`${GRAPH_API_BASE}/debug_token?` +
			new URLSearchParams({
				input_token: accessToken,
				access_token: `${appId}|${appSecret}`,
			}),
	);

	if (!response.ok) {
		throw new Error("Failed to debug token");
	}

	const data: DebugTokenResponse = await response.json();

	const wabaScope = data.data.granular_scopes?.find(
		(scope) => scope.scope === "whatsapp_business_management",
	);

	return wabaScope?.target_ids || [];
}

async function getWABADetails(
	wabaId: string,
	accessToken: string,
): Promise<WABAResponse> {
	const response = await fetch(
		`${GRAPH_API_BASE}/${wabaId}?` +
			new URLSearchParams({
				access_token: accessToken,
			}),
	);

	if (!response.ok) {
		throw new Error("Failed to fetch WABA details");
	}

	return response.json();
}

async function getPhoneNumbers(
	wabaId: string,
	accessToken: string,
): Promise<PhoneNumberResponse> {
	const response = await fetch(
		`${GRAPH_API_BASE}/${wabaId}/phone_numbers?` +
			new URLSearchParams({
				access_token: accessToken,
			}),
	);

	if (!response.ok) {
		throw new Error("Failed to fetch phone numbers");
	}

	return response.json();
}

async function subscribeWABAToWebhook(
	wabaId: string,
	accessToken: string,
): Promise<void> {
	const response = await fetch(`${GRAPH_API_BASE}/${wabaId}/subscribed_apps`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			access_token: accessToken,
		}),
	});

	if (!response.ok) {
		const error = await response.json();
		console.error("Failed to subscribe WABA to webhook:", error);
		// Don't throw - this is non-critical for the signup flow
	}
}

/**
 * Server function to connect a WhatsApp Business Account.
 * Requires authentication via authMiddleware.
 */
export const connectWhatsApp = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((input: { code: string; organizationId: string }) => {
		if (!input.organizationId) {
			throw new Error("Organization ID is required");
		}
		if (!input.code) {
			throw new Error("Authorization code is required");
		}
		return input;
	})
	.handler(async ({ data }) => {
		const { code, organizationId } = data;

		// Exchange code for user token (needed to verify which WABAs were shared)
		const userToken = await exchangeCodeForToken(code);

		// Get shared WABA IDs (use user token to check permissions)
		const wabaIds = await getSharedWABAIds(userToken);

		if (wabaIds.length === 0) {
			throw new Error("No WhatsApp Business Accounts shared");
		}

		const savedWABAs = [];

		// Use system token for API calls (preferred), fallback to user token
		let apiToken: string;
		try {
			apiToken = getSystemAccessToken();
		} catch {
			// Fallback to user token if system token is not configured
			apiToken = userToken;
		}

		// Process each WABA
		for (const wabaId of wabaIds) {
			const wabaDetails = await getWABADetails(wabaId, apiToken);

			const metadata = {
				currency: wabaDetails.currency,
				timezone_id: wabaDetails.timezone_id,
				message_template_namespace: wabaDetails.message_template_namespace,
			};

			const [savedWABA] = await db
				.insert(whatsappBusinessAccounts)
				.values({
					organizationId,
					wabaId,
					name: wabaDetails.name,
					status: "connected",
					metadata,
				})
				.onConflictDoUpdate({
					target: whatsappBusinessAccounts.wabaId,
					set: {
						name: wabaDetails.name,
						status: "connected",
						metadata,
						updatedAt: new Date(),
					},
				})
				.returning();

			// Get and store phone numbers
			const phoneNumbersData = await getPhoneNumbers(wabaId, apiToken);

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
			await subscribeWABAToWebhook(wabaId, apiToken);

			savedWABAs.push(savedWABA);
		}

		return {
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
		};
	});
