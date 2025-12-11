/** biome-ignore-all lint/complexity/noBannedTypes: we use this to ignore the type errors */
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { messageTemplates, whatsappBusinessAccounts } from "@/db/schema";
import { GRAPH_API_BASE, getSystemAccessToken } from "@/lib/facebook-api";
import { authMiddleware } from "@/server/middleware/auth";

// ============================================================================
// TYPES
// ============================================================================

export type Template = typeof messageTemplates.$inferSelect;

export type TemplatesListParams = {
	page?: number;
	pageSize?: number;
	search?: string;
	status?: "approved" | "rejected" | "pending" | "paused" | "disabled";
	category?: "utility" | "marketing" | "authentication";
	sortBy?: "name" | "updatedAt";
	sortOrder?: "asc" | "desc";
};

export type TemplatesListResult = {
	templates: Template[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export type CreateTemplateInput = {
	wabaId: string;
	name: string;
	language: string;
	category: "utility" | "marketing" | "authentication";
	components: TemplateComponent[];
};

export type TemplateComponent = {
	type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
	format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
	text?: string;
	buttons?: Array<{
		type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY";
		text: string;
		phone_number?: string;
		url?: string;
	}>;
	example?: {
		header_text?: string[];
		body_text?: string[][];
	};
};

// Meta API Response Types
interface MetaTemplateResponse {
	data: Array<{
		id: string;
		name: string;
		language: string;
		status: string;
		category: string;
		components: Array<{
			type: string;
			format?: string;
			text?: string;
			buttons?: Array<{
				type: string;
				text: string;
				phone_number?: string;
				url?: string;
			}>;
			example?: {
				header_text?: string[];
				body_text?: string[][];
			};
		}>;
	}>;
	paging?: {
		cursors?: {
			before: string;
			after: string;
		};
		next?: string;
	};
}

interface MetaCreateTemplateResponse {
	id: string;
	status: string;
	category: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapMetaStatusToDbStatus(
	metaStatus: string,
): "pending" | "approved" | "rejected" | "paused" | "disabled" {
	const statusMap: Record<string, typeof messageTemplates.$inferInsert.status> =
		{
			APPROVED: "approved",
			PENDING: "pending",
			REJECTED: "rejected",
			PAUSED: "paused",
			DISABLED: "disabled",
		};
	return (statusMap[metaStatus] || "pending") as
		| "pending"
		| "approved"
		| "rejected"
		| "paused"
		| "disabled";
}

function mapDbCategoryToMetaCategory(
	dbCategory: "utility" | "marketing" | "authentication",
): string {
	const categoryMap: Record<string, string> = {
		utility: "UTILITY",
		marketing: "MARKETING",
		authentication: "AUTHENTICATION",
	};
	return categoryMap[dbCategory] || "UTILITY";
}

// ============================================================================
// TEMPLATES CRUD
// ============================================================================

/**
 * Get paginated list of templates with optional search and filtering
 */
export const getTemplates = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator((params: TemplatesListParams) => params)
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return { templates: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
		}

		const {
			page = 1,
			pageSize = 20,
			search,
			status,
			category,
			sortBy = "updatedAt",
			sortOrder = "desc",
		} = data;

		const offset = (page - 1) * pageSize;

		// Build where conditions
		const conditions = [
			eq(messageTemplates.organizationId, organizationId),
			isNull(messageTemplates.deletedAt),
		];

		if (search) {
			const searchCondition = or(
				ilike(messageTemplates.name, `%${search}%`),
				ilike(messageTemplates.templateId, `%${search}%`),
			);
			if (searchCondition) {
				conditions.push(searchCondition);
			}
		}

		if (status) {
			conditions.push(eq(messageTemplates.status, status));
		}

		if (category) {
			conditions.push(eq(messageTemplates.category, category));
		}

		// Get total count
		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(messageTemplates)
			.where(and(...conditions));
		const total = Number(countResult[0]?.count ?? 0);

		// Build sort
		const sortColumn =
			sortBy === "name" ? messageTemplates.name : messageTemplates.updatedAt;
		const orderFn = sortOrder === "asc" ? asc : desc;

		// Get templates
		const templatesList = await db
			.select()
			.from(messageTemplates)
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(pageSize)
			.offset(offset);

		return {
			templates: templatesList.map((t) => ({
				...t,
				components: t.components as Record<string, {}> | null,
				metadata: t.metadata as Record<string, {}> | null,
			})),
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	});

/**
 * Sync templates from Meta for all connected WABAs
 */
export const syncTemplates = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			throw new Error("No active organization");
		}

		const accessToken = getSystemAccessToken();

		// Get all connected WABAs for this organization
		const wabas = await db.query.whatsappBusinessAccounts.findMany({
			where: and(
				eq(whatsappBusinessAccounts.organizationId, organizationId),
				eq(whatsappBusinessAccounts.status, "connected"),
			),
		});

		if (wabas.length === 0) {
			throw new Error("No connected WhatsApp Business Accounts found");
		}

		let totalSynced = 0;

		// Sync templates for each WABA
		for (const waba of wabas) {
			try {
				const response = await fetch(
					`${GRAPH_API_BASE}/${waba.wabaId}/message_templates?` +
						new URLSearchParams({
							access_token: accessToken,
							limit: "1000",
						}),
				);

				if (!response.ok) {
					const error = await response.json();
					console.error(
						`Failed to fetch templates for WABA ${waba.wabaId}:`,
						error,
					);
					continue;
				}

				const data: MetaTemplateResponse = await response.json();

				// Upsert each template
				for (const template of data.data) {
					await db
						.insert(messageTemplates)
						.values({
							organizationId,
							wabaId: waba.id,
							templateId: template.id,
							name: template.name,
							language: template.language,
							category: template.category.toLowerCase() as
								| "utility"
								| "marketing"
								| "authentication",
							status: mapMetaStatusToDbStatus(template.status),
							components: template.components as unknown as Record<
								string,
								unknown
							>,
						})
						.onConflictDoUpdate({
							target: [messageTemplates.templateId, messageTemplates.wabaId],
							set: {
								name: template.name,
								language: template.language,
								category: template.category.toLowerCase() as
									| "utility"
									| "marketing"
									| "authentication",
								status: mapMetaStatusToDbStatus(template.status),
								components: template.components as unknown as Record<
									string,
									unknown
								>,
								updatedAt: new Date(),
							},
						});

					totalSynced++;
				}
			} catch (error) {
				console.error(
					`Error syncing templates for WABA ${waba.wabaId}:`,
					error,
				);
			}
		}

		return {
			success: true,
			message: `Successfully synced ${totalSynced} templates`,
			count: totalSynced,
		};
	});

/**
 * Get connected WhatsApp Business Accounts for the organization
 */
export const getConnectedWABAs = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return [];
		}

		const wabas = await db.query.whatsappBusinessAccounts.findMany({
			where: and(
				eq(whatsappBusinessAccounts.organizationId, organizationId),
				eq(whatsappBusinessAccounts.status, "connected"),
			),
		});

		return wabas.map((w) => ({
			id: w.id,
			name: w.name,
			wabaId: w.wabaId,
		}));
	});

/**
 * Create a new template and submit to Meta
 */
export const createTemplate = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((input: CreateTemplateInput) => {
		if (!input.wabaId) {
			throw new Error("WABA ID is required");
		}
		if (!input.name) {
			throw new Error("Template name is required");
		}
		if (!/^[a-z0-9_]+$/.test(input.name)) {
			throw new Error("Template name must be lowercase with underscores only");
		}
		if (!input.language) {
			throw new Error("Language is required");
		}
		if (!input.category) {
			throw new Error("Category is required");
		}
		if (!input.components || input.components.length === 0) {
			throw new Error("At least one component is required");
		}
		return input;
	})
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			throw new Error("No active organization");
		}

		const accessToken = getSystemAccessToken();

		// Verify WABA belongs to organization
		const waba = await db.query.whatsappBusinessAccounts.findFirst({
			where: and(
				eq(whatsappBusinessAccounts.id, data.wabaId),
				eq(whatsappBusinessAccounts.organizationId, organizationId),
			),
		});

		if (!waba) {
			throw new Error("WhatsApp Business Account not found");
		}

		// Submit to Meta
		const response = await fetch(
			`${GRAPH_API_BASE}/${waba.wabaId}/message_templates`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: data.name,
					language: data.language,
					category: mapDbCategoryToMetaCategory(data.category),
					components: data.components,
					access_token: accessToken,
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(
				error.error?.message || "Failed to create template in Meta",
			);
		}

		const metaResponse: MetaCreateTemplateResponse = await response.json();

		// Save to database
		const [newTemplate] = await db
			.insert(messageTemplates)
			.values({
				organizationId,
				wabaId: waba.id,
				templateId: metaResponse.id,
				name: data.name,
				language: data.language,
				category: data.category,
				status: mapMetaStatusToDbStatus(metaResponse.status),
				components: data.components as unknown as Record<string, unknown>,
			})
			.returning();

		return {
			success: true,
			message: "Template created successfully and submitted for approval",
			template: {
				...newTemplate,
				components: newTemplate.components as Record<string, {}> | null,
				metadata: newTemplate.metadata as Record<string, {}> | null,
			},
		};
	});
