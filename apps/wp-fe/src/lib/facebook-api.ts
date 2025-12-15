/**
 * Facebook Graph API Configuration and Utilities
 * Centralized configuration for all Facebook/Meta API interactions
 */

export const GRAPH_API_VERSION = "v21.0";
export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Get the Facebook System User Access Token from environment
 * This token is used for server-side API calls
 */
export function getSystemAccessToken(): string {
	const token = process.env.FACEBOOK_SYSTEM_USER_TOKEN;
	if (!token) {
		throw new Error("FACEBOOK_SYSTEM_USER_TOKEN not configured");
	}
	return token;
}

/**
 * Get Facebook App credentials from environment
 */
export function getFacebookAppCredentials(): {
	appId: string;
	appSecret: string;
} {
	const appId = process.env.FACEBOOK_APP_ID || process.env.VITE_FACEBOOK_APP_ID;
	const appSecret = process.env.FACEBOOK_APP_SECRET;

	if (!appId || !appSecret) {
		throw new Error("Facebook app credentials not configured");
	}

	return { appId, appSecret };
}

/**
 * Build a Graph API URL with query parameters
 */
export function buildGraphApiUrl(
	path: string,
	params: Record<string, string> = {},
): string {
	const url = new URL(`${GRAPH_API_BASE}${path}`);
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.append(key, value);
	}
	return url.toString();
}

/**
 * Make a Graph API request with error handling
 */
export async function graphApiRequest<T = unknown>(
	path: string,
	options: {
		method?: "GET" | "POST" | "DELETE";
		accessToken: string;
		body?: Record<string, unknown>;
		params?: Record<string, string>;
	},
): Promise<T> {
	const { method = "GET", accessToken, body, params = {} } = options;

	const url = buildGraphApiUrl(path, {
		...params,
		access_token: accessToken,
	});

	const fetchOptions: RequestInit = {
		method,
		headers: {
			"Content-Type": "application/json",
		},
	};

	if (body && method !== "GET") {
		fetchOptions.body = JSON.stringify(body);
	}

	const response = await fetch(url, fetchOptions);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(
			error.error?.message || `Graph API request failed: ${response.status}`,
		);
	}

	return response.json();
}
