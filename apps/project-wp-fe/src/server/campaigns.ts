/** biome-ignore-all lint/complexity/noBannedTypes: we use this to ignore the type errors */
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
	campaignRecipients,
	campaigns,
	contacts,
	contactsToTags,
	contactTags,
	conversations,
	messages,
	messageTemplates,
	phoneNumbers,
	whatsappBusinessAccounts,
} from "@/db/schema";
import { GRAPH_API_BASE, getSystemAccessToken } from "@/lib/facebook-api";
import { authMiddleware } from "@/server/middleware/auth";

// ============================================================================
// TYPES
// ============================================================================

export type Campaign = typeof campaigns.$inferSelect;
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;

export type CampaignsListParams = {
	page?: number;
	pageSize?: number;
	search?: string;
	status?:
		| "draft"
		| "scheduled"
		| "running"
		| "paused"
		| "completed"
		| "cancelled";
	sortBy?: "name" | "createdAt" | "scheduledAt";
	sortOrder?: "asc" | "desc";
};

export type CampaignsListResult = {
	campaigns: Campaign[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export type CreateCampaignInput = {
	name: string;
	description?: string;
	phoneNumberId: string;
	templateId: string;
	tagIds: string[];
	scheduledAt?: string; // ISO date string
	templateVariables?: Record<string, string[]>; // component type -> variable values
};

export type CampaignWithDetails = Campaign & {
	template: {
		id: string;
		name: string;
		language: string;
		components: Record<string, unknown>[] | null;
	} | null;
	phoneNumber: {
		id: string;
		phoneNumber: string;
		displayName: string | null;
	} | null;
	recipients: Array<{
		id: string;
		contactId: string;
		status: string;
		contactName: string | null;
		contactPhone: string;
		sentAt: Date | null;
		deliveredAt: Date | null;
		readAt: Date | null;
		failedAt: Date | null;
		errorMessage: string | null;
	}>;
};

// ============================================================================
// CAMPAIGNS CRUD
// ============================================================================

/**
 * Get paginated list of campaigns
 */
export const getCampaigns = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator((params: CampaignsListParams) => params)
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return { campaigns: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
		}

		const {
			page = 1,
			pageSize = 20,
			search,
			status,
			sortBy = "createdAt",
			sortOrder = "desc",
		} = data;

		const offset = (page - 1) * pageSize;

		// Build where conditions
		const conditions = [
			eq(campaigns.organizationId, organizationId),
			isNull(campaigns.deletedAt),
		];

		if (search) {
			conditions.push(sql`${campaigns.name} ILIKE ${`%${search}%`}`);
		}

		if (status) {
			conditions.push(eq(campaigns.status, status));
		}

		// Get total count
		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(campaigns)
			.where(and(...conditions));
		const total = Number(countResult[0]?.count ?? 0);

		// Build sort
		const sortColumn =
			sortBy === "name"
				? campaigns.name
				: sortBy === "scheduledAt"
					? campaigns.scheduledAt
					: campaigns.createdAt;
		const orderFn = sortOrder === "asc" ? asc : desc;

		// Get campaigns
		const campaignsList = await db
			.select()
			.from(campaigns)
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(pageSize)
			.offset(offset);

		return {
			campaigns: campaignsList.map((c) => ({
				...c,
				metadata: c.metadata as Record<string, {}> | null,
			})),
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	});

/**
 * Get a single campaign by ID with full details
 */
export const getCampaignById = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator((id: string) => id)
	.handler(async ({ data: id, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return null;
		}

		const campaign = await db.query.campaigns.findFirst({
			where: and(
				eq(campaigns.id, id),
				eq(campaigns.organizationId, organizationId),
				isNull(campaigns.deletedAt),
			),
			with: {
				template: true,
				phoneNumber: true,
				recipients: {
					with: {
						contact: true,
					},
				},
			},
		});

		if (!campaign) {
			return null;
		}

		return {
			...campaign,
			metadata: campaign.metadata as Record<string, {}> | null,
			template: campaign.template
				? {
						id: campaign.template.id,
						name: campaign.template.name,
						language: campaign.template.language,
						components: campaign.template.components as
							| Record<string, {}>[]
							| null,
					}
				: null,
			phoneNumber: campaign.phoneNumber
				? {
						id: campaign.phoneNumber.id,
						phoneNumber: campaign.phoneNumber.phoneNumber,
						displayName: campaign.phoneNumber.displayName,
					}
				: null,
			recipients: campaign.recipients.map((r) => ({
				id: r.id,
				contactId: r.contactId,
				status: r.status,
				contactName: r.contact.name,
				contactPhone: r.contact.phoneNumber,
				sentAt: r.sentAt,
				deliveredAt: r.deliveredAt,
				readAt: r.readAt,
				failedAt: r.failedAt,
				errorMessage: r.errorMessage,
			})),
		};
	});

/**
 * Create a new campaign
 */
export const createCampaign = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((input: CreateCampaignInput) => {
		if (!input.name) {
			throw new Error("Campaign name is required");
		}
		if (!input.phoneNumberId) {
			throw new Error("Sender phone number is required");
		}
		if (!input.templateId) {
			throw new Error("Template is required");
		}
		if (!input.tagIds || input.tagIds.length === 0) {
			throw new Error("At least one audience tag is required");
		}
		return input;
	})
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			throw new Error("No active organization");
		}

		// Verify phone number belongs to organization
		const phoneNumber = await db.query.phoneNumbers.findFirst({
			where: eq(phoneNumbers.id, data.phoneNumberId),
			with: {
				whatsappBusinessAccount: true,
			},
		});

		if (
			!phoneNumber ||
			phoneNumber.whatsappBusinessAccount.organizationId !== organizationId
		) {
			throw new Error("Phone number not found");
		}

		// Verify template belongs to organization and is approved
		const template = await db.query.messageTemplates.findFirst({
			where: and(
				eq(messageTemplates.id, data.templateId),
				eq(messageTemplates.organizationId, organizationId),
				eq(messageTemplates.status, "approved"),
			),
		});

		if (!template) {
			throw new Error("Template not found or not approved");
		}

		// Get contacts by tags
		const contactIds = await db
			.selectDistinct({ contactId: contactsToTags.contactId })
			.from(contactsToTags)
			.innerJoin(contacts, eq(contactsToTags.contactId, contacts.id))
			.where(
				and(
					inArray(contactsToTags.tagId, data.tagIds),
					eq(contacts.organizationId, organizationId),
					isNull(contacts.deletedAt),
				),
			);

		if (contactIds.length === 0) {
			throw new Error("No contacts found with the selected tags");
		}

		// Determine status based on scheduling
		const status = data.scheduledAt ? "scheduled" : "draft";
		const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;

		// Create campaign
		const [newCampaign] = await db
			.insert(campaigns)
			.values({
				organizationId,
				phoneNumberId: data.phoneNumberId,
				templateId: data.templateId,
				name: data.name,
				description: data.description || null,
				status,
				scheduledAt,
				totalRecipients: contactIds.length,
				metadata: data.templateVariables
					? { templateVariables: data.templateVariables }
					: null,
			})
			.returning();

		// Create campaign recipients
		await db.insert(campaignRecipients).values(
			contactIds.map((c) => ({
				campaignId: newCampaign.id,
				contactId: c.contactId,
				status: "pending" as const,
			})),
		);

		return {
			success: true,
			campaign: {
				...newCampaign,
				metadata: newCampaign.metadata as Record<string, {}> | null,
			},
		};
	});

/**
 * Delete a campaign (soft delete)
 */
export const deleteCampaign = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((id: string) => {
		if (!id) {
			throw new Error("Campaign ID is required");
		}
		return id;
	})
	.handler(async ({ data: id, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return false;
		}

		const existing = await db.query.campaigns.findFirst({
			where: and(
				eq(campaigns.id, id),
				eq(campaigns.organizationId, organizationId),
				isNull(campaigns.deletedAt),
			),
		});

		if (!existing) {
			return false;
		}

		// Only allow deleting draft or scheduled campaigns
		if (
			!["draft", "scheduled", "completed", "cancelled"].includes(
				existing.status,
			)
		) {
			throw new Error("Cannot delete a running campaign");
		}

		await db
			.update(campaigns)
			.set({
				deletedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(campaigns.id, id));

		return true;
	});

/**
 * Get phone numbers for the organization
 */
export const getPhoneNumbers = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return [];
		}

		const phones = await db
			.select({
				id: phoneNumbers.id,
				phoneNumber: phoneNumbers.phoneNumber,
				displayPhoneNumber: phoneNumbers.displayPhoneNumber,
				displayName: phoneNumbers.displayName,
				phoneNumberId: phoneNumbers.phoneNumberId,
				wabaId: phoneNumbers.wabaId,
			})
			.from(phoneNumbers)
			.innerJoin(
				whatsappBusinessAccounts,
				eq(phoneNumbers.wabaId, whatsappBusinessAccounts.id),
			)
			.where(
				and(
					eq(whatsappBusinessAccounts.organizationId, organizationId),
					eq(whatsappBusinessAccounts.status, "connected"),
				),
			);

		return phones;
	});

/**
 * Get contacts count by tag IDs (for audience preview)
 */
export const getContactsCountByTags = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator((tagIds: string[]) => tagIds)
	.handler(async ({ data: tagIds, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId || tagIds.length === 0) {
			return { count: 0 };
		}

		const result = await db
			.selectDistinct({ contactId: contactsToTags.contactId })
			.from(contactsToTags)
			.innerJoin(contacts, eq(contactsToTags.contactId, contacts.id))
			.where(
				and(
					inArray(contactsToTags.tagId, tagIds),
					eq(contacts.organizationId, organizationId),
					isNull(contacts.deletedAt),
				),
			);

		return { count: result.length };
	});

/**
 * Get approved templates for campaign creation
 */
export const getApprovedTemplates = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return [];
		}

		const templates = await db.query.messageTemplates.findMany({
			where: and(
				eq(messageTemplates.organizationId, organizationId),
				eq(messageTemplates.status, "approved"),
				isNull(messageTemplates.deletedAt),
			),
			orderBy: asc(messageTemplates.name),
		});

		return templates.map((t) => ({
			...t,
			components: t.components as Record<string, {}>[] | null,
			metadata: t.metadata as Record<string, {}> | null,
		}));
	});

/**
 * Send a campaign - execute sending to all recipients
 */
export const sendCampaign = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((id: string) => {
		if (!id) {
			throw new Error("Campaign ID is required");
		}
		return id;
	})
	.handler(async ({ data: id, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			throw new Error("No active organization");
		}

		// Get campaign with all related data
		const campaign = await db.query.campaigns.findFirst({
			where: and(
				eq(campaigns.id, id),
				eq(campaigns.organizationId, organizationId),
				isNull(campaigns.deletedAt),
			),
			with: {
				template: true,
				phoneNumber: true,
				recipients: {
					with: {
						contact: true,
					},
				},
			},
		});

		if (!campaign) {
			throw new Error("Campaign not found");
		}

		if (!["draft", "scheduled"].includes(campaign.status)) {
			throw new Error("Campaign cannot be sent in its current status");
		}

		if (!campaign.template) {
			throw new Error("Campaign template not found");
		}

		if (!campaign.phoneNumber) {
			throw new Error("Campaign phone number not found");
		}

		const accessToken = getSystemAccessToken();

		// Update campaign status to running
		await db
			.update(campaigns)
			.set({
				status: "running",
				startedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(campaigns.id, id));

		let sentCount = 0;
		let failedCount = 0;

		// Get template variables from metadata
		const templateVariables =
			(campaign.metadata as { templateVariables?: Record<string, string[]> })
				?.templateVariables || {};

		// Send to each recipient
		for (const recipient of campaign.recipients) {
			try {
				// Build template components with variables
				const components: Array<{
					type: string;
					parameters?: Array<{ type: string; text: string }>;
				}> = [];

				// Add header variables if present
				if (templateVariables.HEADER?.length) {
					components.push({
						type: "header",
						parameters: templateVariables.HEADER.map((text) => ({
							type: "text",
							text,
						})),
					});
				}

				// Add body variables if present
				if (templateVariables.BODY?.length) {
					components.push({
						type: "body",
						parameters: templateVariables.BODY.map((text) => ({
							type: "text",
							text,
						})),
					});
				}

				// Send message via Meta API
				const response = await fetch(
					`${GRAPH_API_BASE}/${campaign.phoneNumber.phoneNumberId}/messages`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
						body: JSON.stringify({
							messaging_product: "whatsapp",
							to: recipient.contact.phoneNumber,
							type: "template",
							template: {
								name: campaign.template.name,
								language: { code: campaign.template.language },
								components: components.length > 0 ? components : undefined,
							},
						}),
					},
				);

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error?.message || "Failed to send message");
				}

				const result = await response.json();
				const wamid = result.messages?.[0]?.id;

				// Find or create conversation
				let conversation = await db.query.conversations.findFirst({
					where: and(
						eq(conversations.contactId, recipient.contactId),
						eq(conversations.phoneNumberId, campaign.phoneNumberId),
					),
				});

				if (!conversation) {
					const [newConversation] = await db
						.insert(conversations)
						.values({
							organizationId,
							contactId: recipient.contactId,
							phoneNumberId: campaign.phoneNumberId,
							lastMessageAt: new Date(),
							isOpen: true,
						})
						.returning();
					conversation = newConversation;
				}

				// Store message
				const [message] = await db
					.insert(messages)
					.values({
						conversationId: conversation.id,
						wamid,
						direction: "outbound",
						type: "template",
						content: {
							template: {
								name: campaign.template.name,
								language: campaign.template.language,
							},
						},
						status: "sent",
						sentAt: new Date(),
					})
					.returning();

				// Update recipient status
				await db
					.update(campaignRecipients)
					.set({
						messageId: message.id,
						status: "sent",
						sentAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(campaignRecipients.id, recipient.id));

				sentCount++;
			} catch (error) {
				// Update recipient with error
				await db
					.update(campaignRecipients)
					.set({
						status: "failed",
						failedAt: new Date(),
						errorMessage:
							error instanceof Error ? error.message : "Unknown error",
						updatedAt: new Date(),
					})
					.where(eq(campaignRecipients.id, recipient.id));

				failedCount++;
				console.error(
					`Failed to send to ${recipient.contact.phoneNumber}:`,
					error,
				);
			}
		}

		// Update campaign stats
		await db
			.update(campaigns)
			.set({
				status: "completed",
				completedAt: new Date(),
				sentCount,
				failedCount,
				updatedAt: new Date(),
			})
			.where(eq(campaigns.id, id));

		return {
			success: true,
			message: `Campaign sent: ${sentCount} delivered, ${failedCount} failed`,
			sentCount,
			failedCount,
		};
	});

/**
 * Get all tags for audience selection
 */
export const getAllTags = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return [];
		}

		return db.query.contactTags.findMany({
			where: eq(contactTags.organizationId, organizationId),
			orderBy: asc(contactTags.name),
		});
	});

// ============================================================================
// RESEND FAILED MESSAGES
// ============================================================================

/**
 * Helper function to send a template message to a single recipient
 */
async function sendTemplateToRecipient(
	organizationId: string,
	campaign: {
		id: string;
		phoneNumberId: string;
		template: { name: string; language: string };
		phoneNumber: { phoneNumberId: string | null };
		metadata: unknown;
	},
	recipient: {
		id: string;
		contactId: string;
		contact: { phoneNumber: string };
	},
): Promise<{ success: boolean; error?: string }> {
	const accessToken = getSystemAccessToken();

	// Get template variables from metadata
	const templateVariables =
		(campaign.metadata as { templateVariables?: Record<string, string[]> })
			?.templateVariables || {};

	// Build template components with variables
	const components: Array<{
		type: string;
		parameters?: Array<{ type: string; text: string }>;
	}> = [];

	if (templateVariables.HEADER?.length) {
		components.push({
			type: "header",
			parameters: templateVariables.HEADER.map((text) => ({
				type: "text",
				text,
			})),
		});
	}

	if (templateVariables.BODY?.length) {
		components.push({
			type: "body",
			parameters: templateVariables.BODY.map((text) => ({
				type: "text",
				text,
			})),
		});
	}

	try {
		const response = await fetch(
			`${GRAPH_API_BASE}/${campaign.phoneNumber.phoneNumberId}/messages`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					messaging_product: "whatsapp",
					to: recipient.contact.phoneNumber,
					type: "template",
					template: {
						name: campaign.template.name,
						language: { code: campaign.template.language },
						components: components.length > 0 ? components : undefined,
					},
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || "Failed to send message");
		}

		const result = await response.json();
		const wamid = result.messages?.[0]?.id;

		// Find or create conversation
		let conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.contactId, recipient.contactId),
				eq(conversations.phoneNumberId, campaign.phoneNumberId),
			),
		});

		if (!conversation) {
			const [newConversation] = await db
				.insert(conversations)
				.values({
					organizationId,
					contactId: recipient.contactId,
					phoneNumberId: campaign.phoneNumberId,
					lastMessageAt: new Date(),
					isOpen: true,
				})
				.returning();
			conversation = newConversation;
		}

		// Store message
		const [message] = await db
			.insert(messages)
			.values({
				conversationId: conversation.id,
				wamid,
				direction: "outbound",
				type: "template",
				content: {
					template: {
						name: campaign.template.name,
						language: campaign.template.language,
					},
				},
				status: "sent",
				sentAt: new Date(),
			})
			.returning();

		// Update recipient status
		await db
			.update(campaignRecipients)
			.set({
				messageId: message.id,
				status: "sent",
				sentAt: new Date(),
				failedAt: null,
				errorMessage: null,
				updatedAt: new Date(),
			})
			.where(eq(campaignRecipients.id, recipient.id));

		return { success: true };
	} catch (error) {
		// Update recipient with error
		await db
			.update(campaignRecipients)
			.set({
				status: "failed",
				failedAt: new Date(),
				errorMessage: error instanceof Error ? error.message : "Unknown error",
				updatedAt: new Date(),
			})
			.where(eq(campaignRecipients.id, recipient.id));

		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Resend a single failed recipient
 */
export const resendFailedRecipient = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((input: { campaignId: string; recipientId: string }) => {
		if (!input.campaignId) {
			throw new Error("Campaign ID is required");
		}
		if (!input.recipientId) {
			throw new Error("Recipient ID is required");
		}
		return input;
	})
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			throw new Error("No active organization");
		}

		// Get campaign with template and phone number
		const campaign = await db.query.campaigns.findFirst({
			where: and(
				eq(campaigns.id, data.campaignId),
				eq(campaigns.organizationId, organizationId),
				isNull(campaigns.deletedAt),
			),
			with: {
				template: true,
				phoneNumber: true,
			},
		});

		if (!campaign) {
			throw new Error("Campaign not found");
		}

		if (!campaign.template) {
			throw new Error("Campaign template not found");
		}

		if (!campaign.phoneNumber) {
			throw new Error("Campaign phone number not found");
		}

		// Get the recipient
		const recipient = await db.query.campaignRecipients.findFirst({
			where: and(
				eq(campaignRecipients.id, data.recipientId),
				eq(campaignRecipients.campaignId, data.campaignId),
			),
			with: {
				contact: true,
			},
		});

		if (!recipient) {
			throw new Error("Recipient not found");
		}

		if (recipient.status !== "failed") {
			throw new Error("Recipient is not in failed status");
		}

		const result = await sendTemplateToRecipient(
			organizationId,
			{
				id: campaign.id,
				phoneNumberId: campaign.phoneNumberId,
				template: {
					name: campaign.template.name,
					language: campaign.template.language,
				},
				phoneNumber: {
					phoneNumberId: campaign.phoneNumber.phoneNumberId,
				},
				metadata: campaign.metadata,
			},
			{
				id: recipient.id,
				contactId: recipient.contactId,
				contact: { phoneNumber: recipient.contact.phoneNumber },
			},
		);

		// Update campaign stats
		if (result.success) {
			await db
				.update(campaigns)
				.set({
					sentCount: sql`${campaigns.sentCount} + 1`,
					failedCount: sql`GREATEST(${campaigns.failedCount} - 1, 0)`,
					updatedAt: new Date(),
				})
				.where(eq(campaigns.id, data.campaignId));
		}

		return {
			success: result.success,
			message: result.success
				? "Message resent successfully"
				: `Failed to resend: ${result.error}`,
		};
	});

/**
 * Resend all failed recipients in a campaign
 */
export const resendAllFailedRecipients = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((campaignId: string) => {
		if (!campaignId) {
			throw new Error("Campaign ID is required");
		}
		return campaignId;
	})
	.handler(async ({ data: campaignId, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			throw new Error("No active organization");
		}

		// Get campaign with template and phone number
		const campaign = await db.query.campaigns.findFirst({
			where: and(
				eq(campaigns.id, campaignId),
				eq(campaigns.organizationId, organizationId),
				isNull(campaigns.deletedAt),
			),
			with: {
				template: true,
				phoneNumber: true,
				recipients: {
					where: eq(campaignRecipients.status, "failed"),
					with: {
						contact: true,
					},
				},
			},
		});

		if (!campaign) {
			throw new Error("Campaign not found");
		}

		if (!campaign.template) {
			throw new Error("Campaign template not found");
		}

		if (!campaign.phoneNumber) {
			throw new Error("Campaign phone number not found");
		}

		const failedRecipients = campaign.recipients;
		if (failedRecipients.length === 0) {
			return {
				success: true,
				message: "No failed recipients to resend",
				sentCount: 0,
				failedCount: 0,
			};
		}

		let sentCount = 0;
		let stillFailedCount = 0;

		for (const recipient of failedRecipients) {
			const result = await sendTemplateToRecipient(
				organizationId,
				{
					id: campaign.id,
					phoneNumberId: campaign.phoneNumberId,
					template: {
						name: campaign.template.name,
						language: campaign.template.language,
					},
					phoneNumber: {
						phoneNumberId: campaign.phoneNumber.phoneNumberId,
					},
					metadata: campaign.metadata,
				},
				{
					id: recipient.id,
					contactId: recipient.contactId,
					contact: { phoneNumber: recipient.contact.phoneNumber },
				},
			);

			if (result.success) {
				sentCount++;
			} else {
				stillFailedCount++;
			}
		}

		// Update campaign stats
		await db
			.update(campaigns)
			.set({
				sentCount: sql`${campaigns.sentCount} + ${sentCount}`,
				failedCount: stillFailedCount,
				updatedAt: new Date(),
			})
			.where(eq(campaigns.id, campaignId));

		return {
			success: true,
			message: `Resent ${sentCount} messages, ${stillFailedCount} still failed`,
			sentCount,
			failedCount: stillFailedCount,
		};
	});
