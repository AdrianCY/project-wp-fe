import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
	member,
	organization,
	whatsappBusinessAccounts,
} from "@/db/schema";

/**
 * Server function to get the current session.
 * This ensures the database code only runs on the server.
 */
export const getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		return session;
	}
);

export type ActiveOrganization = {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
} | null;

export type UserStatus = {
	session: Awaited<ReturnType<typeof auth.api.getSession>>;
	hasOrganization: boolean;
	hasConnectedWABA: boolean;
	activeOrganization: ActiveOrganization;
};

/**
 * Server function to get the user's onboarding status in one request.
 * Returns session, organization membership status, WhatsApp connection status,
 * and active organization details.
 */
export const getUserStatus = createServerFn({ method: "GET" }).handler(
	async (): Promise<UserStatus> => {
		const request = getRequest();
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session) {
			return {
				session: null,
				hasOrganization: false,
				hasConnectedWABA: false,
				activeOrganization: null,
			};
		}

		// Check if user has any organizations
		const memberships = await db.query.member.findMany({
			where: eq(member.userId, session.user.id),
			limit: 1,
		});
		const hasOrganization = memberships.length > 0;

		// Fetch active organization details and check for connected WABA
		let hasConnectedWABA = false;
		let activeOrganization: ActiveOrganization = null;

		if (session.session.activeOrganizationId) {
			// Fetch organization details
			const org = await db.query.organization.findFirst({
				where: eq(organization.id, session.session.activeOrganizationId),
			});

			if (org) {
				activeOrganization = {
					id: org.id,
					name: org.name,
					slug: org.slug,
					logo: org.logo,
				};
			}

			// Check for connected WABA
			const wabas = await db.query.whatsappBusinessAccounts.findMany({
				where: eq(
					whatsappBusinessAccounts.organizationId,
					session.session.activeOrganizationId
				),
			});
			hasConnectedWABA = wabas.some((w) => w.status === "connected");
		}

		return {
			session,
			hasOrganization,
			hasConnectedWABA,
			activeOrganization,
		};
	}
);

