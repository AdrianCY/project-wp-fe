import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { whatsappBusinessAccounts } from "wp-db";
import { db } from "@/db";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/api/whatsapp/status")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					// Verify user is authenticated
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session) {
						return new Response(JSON.stringify({ error: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					const url = new URL(request.url);
					const orgId = url.searchParams.get("orgId");

					if (!orgId) {
						return new Response(
							JSON.stringify({ error: "Organization ID is required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Check if organization has any connected WABAs
					const wabas = await db.query.whatsappBusinessAccounts.findMany({
						where: eq(whatsappBusinessAccounts.organizationId, orgId),
					});

					const connectedWABAs = wabas.filter((w) => w.status === "connected");

					return new Response(
						JSON.stringify({
							hasConnectedWABA: connectedWABAs.length > 0,
							wabaCount: connectedWABAs.length,
							wabas: connectedWABAs.map((w) => ({
								id: w.id,
								name: w.name,
								wabaId: w.wabaId,
								status: w.status,
							})),
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("WABA status check error:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
