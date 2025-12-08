import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

// Re-export Better Auth schema
export * from "./auth-schema";

// ============================================================================
// ENUMS
// ============================================================================

export const wabaStatusEnum = pgEnum("waba_status", [
	"pending",
	"connected",
	"disconnected",
	"suspended",
]);

export const phoneNumberStatusEnum = pgEnum("phone_number_status", [
	"pending",
	"verified",
	"unverified",
]);

export const qualityRatingEnum = pgEnum("quality_rating", [
	"green",
	"yellow",
	"red",
	"unknown",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
	"inbound",
	"outbound",
]);

export const messageTypeEnum = pgEnum("message_type", [
	"text",
	"image",
	"video",
	"audio",
	"document",
	"sticker",
	"location",
	"contacts",
	"interactive",
	"template",
	"reaction",
	"unknown",
]);

export const messageStatusEnum = pgEnum("message_status", [
	"pending",
	"sent",
	"delivered",
	"read",
	"failed",
]);

export const templateStatusEnum = pgEnum("template_status", [
	"pending",
	"approved",
	"rejected",
	"paused",
	"disabled",
]);

export const templateCategoryEnum = pgEnum("template_category", [
	"utility",
	"marketing",
	"authentication",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
	"draft",
	"scheduled",
	"running",
	"paused",
	"completed",
	"cancelled",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
	"subscribed",
	"unsubscribed",
	"pending",
]);

export const flowStatusEnum = pgEnum("flow_status", [
	"draft",
	"published",
	"deprecated",
]);

// ============================================================================
// WHATSAPP BUSINESS ACCOUNTS
// ============================================================================

export const whatsappBusinessAccounts = pgTable(
	"whatsapp_business_accounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		wabaId: varchar("waba_id", { length: 255 }).notNull().unique(),
		name: varchar("name", { length: 255 }).notNull(),
		status: wabaStatusEnum("status").default("pending").notNull(),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("waba_org_idx").on(table.organizationId),
		index("waba_status_idx").on(table.status),
	],
);

// ============================================================================
// PHONE NUMBERS
// ============================================================================

export const phoneNumbers = pgTable(
	"phone_numbers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		wabaId: uuid("waba_id")
			.notNull()
			.references(() => whatsappBusinessAccounts.id, { onDelete: "cascade" }),
		phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
		displayPhoneNumber: varchar("display_phone_number", { length: 30 }),
		displayName: varchar("display_name", { length: 255 }),
		qualityRating: qualityRatingEnum("quality_rating").default("unknown"),
		status: phoneNumberStatusEnum("status").default("pending").notNull(),
		phoneNumberId: varchar("phone_number_id", { length: 255 }).unique(),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("phone_waba_idx").on(table.wabaId),
		index("phone_number_idx").on(table.phoneNumber),
	],
);

// ============================================================================
// CONTACTS
// ============================================================================

export const contacts = pgTable(
	"contacts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
		waId: varchar("wa_id", { length: 50 }),
		name: varchar("name", { length: 255 }),
		email: varchar("email", { length: 255 }),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("contact_org_idx").on(table.organizationId),
		index("contact_phone_idx").on(table.phoneNumber),
		index("contact_org_phone_idx").on(table.organizationId, table.phoneNumber),
	],
);

// ============================================================================
// CONTACT TAGS
// ============================================================================

export const contactTags = pgTable(
	"contact_tags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		name: varchar("name", { length: 100 }).notNull(),
		color: varchar("color", { length: 7 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("tag_org_idx").on(table.organizationId)],
);

export const contactsToTags = pgTable(
	"contacts_to_tags",
	{
		contactId: uuid("contact_id")
			.notNull()
			.references(() => contacts.id, { onDelete: "cascade" }),
		tagId: uuid("tag_id")
			.notNull()
			.references(() => contactTags.id, { onDelete: "cascade" }),
	},
	(table) => [index("contact_tag_idx").on(table.contactId, table.tagId)],
);

// ============================================================================
// CONTACT SUBSCRIPTIONS
// ============================================================================

export const contactSubscriptions = pgTable(
	"contact_subscriptions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		contactId: uuid("contact_id")
			.notNull()
			.references(() => contacts.id, { onDelete: "cascade" }),
		status: subscriptionStatusEnum("status").default("subscribed").notNull(),
		subscribedAt: timestamp("subscribed_at").defaultNow(),
		unsubscribedAt: timestamp("unsubscribed_at"),
		reason: text("reason"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("subscription_contact_idx").on(table.contactId),
		index("subscription_status_idx").on(table.status),
	],
);

// ============================================================================
// CONVERSATIONS
// ============================================================================

export const conversations = pgTable(
	"conversations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		contactId: uuid("contact_id")
			.notNull()
			.references(() => contacts.id, { onDelete: "cascade" }),
		phoneNumberId: uuid("phone_number_id")
			.notNull()
			.references(() => phoneNumbers.id, { onDelete: "cascade" }),
		lastMessageAt: timestamp("last_message_at"),
		windowExpiresAt: timestamp("window_expires_at"),
		isOpen: boolean("is_open").default(true).notNull(),
		assignedToUserId: text("assigned_to_user_id"),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("conv_org_idx").on(table.organizationId),
		index("conv_contact_idx").on(table.contactId),
		index("conv_phone_idx").on(table.phoneNumberId),
		index("conv_open_idx").on(table.isOpen),
		index("conv_assigned_idx").on(table.assignedToUserId),
	],
);

// ============================================================================
// MESSAGES
// ============================================================================

export const messages = pgTable(
	"messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		wamid: varchar("wamid", { length: 255 }).unique(),
		direction: messageDirectionEnum("direction").notNull(),
		type: messageTypeEnum("type").notNull(),
		content: jsonb("content"),
		status: messageStatusEnum("status").default("pending").notNull(),
		sentAt: timestamp("sent_at"),
		deliveredAt: timestamp("delivered_at"),
		readAt: timestamp("read_at"),
		failedAt: timestamp("failed_at"),
		errorCode: varchar("error_code", { length: 50 }),
		errorMessage: text("error_message"),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("msg_conv_idx").on(table.conversationId),
		index("msg_wamid_idx").on(table.wamid),
		index("msg_status_idx").on(table.status),
		index("msg_direction_idx").on(table.direction),
		index("msg_created_idx").on(table.createdAt),
	],
);

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================

export const messageTemplates = pgTable(
	"message_templates",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		wabaId: uuid("waba_id")
			.notNull()
			.references(() => whatsappBusinessAccounts.id, { onDelete: "cascade" }),
		templateId: varchar("template_id", { length: 255 }),
		name: varchar("name", { length: 255 }).notNull(),
		language: varchar("language", { length: 10 }).notNull(),
		category: templateCategoryEnum("category").notNull(),
		status: templateStatusEnum("status").default("pending").notNull(),
		components: jsonb("components"),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("template_org_idx").on(table.organizationId),
		index("template_waba_idx").on(table.wabaId),
		index("template_status_idx").on(table.status),
		index("template_name_idx").on(table.name),
	],
);

// ============================================================================
// CAMPAIGNS
// ============================================================================

export const campaigns = pgTable(
	"campaigns",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		phoneNumberId: uuid("phone_number_id")
			.notNull()
			.references(() => phoneNumbers.id, { onDelete: "cascade" }),
		templateId: uuid("template_id").references(() => messageTemplates.id, {
			onDelete: "set null",
		}),
		name: varchar("name", { length: 255 }).notNull(),
		description: text("description"),
		status: campaignStatusEnum("status").default("draft").notNull(),
		scheduledAt: timestamp("scheduled_at"),
		startedAt: timestamp("started_at"),
		completedAt: timestamp("completed_at"),
		totalRecipients: integer("total_recipients").default(0),
		sentCount: integer("sent_count").default(0),
		deliveredCount: integer("delivered_count").default(0),
		readCount: integer("read_count").default(0),
		failedCount: integer("failed_count").default(0),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("campaign_org_idx").on(table.organizationId),
		index("campaign_status_idx").on(table.status),
		index("campaign_scheduled_idx").on(table.scheduledAt),
	],
);

// ============================================================================
// CAMPAIGN RECIPIENTS
// ============================================================================

export const campaignRecipients = pgTable(
	"campaign_recipients",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		campaignId: uuid("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		contactId: uuid("contact_id")
			.notNull()
			.references(() => contacts.id, { onDelete: "cascade" }),
		messageId: uuid("message_id").references(() => messages.id, {
			onDelete: "set null",
		}),
		status: messageStatusEnum("status").default("pending").notNull(),
		sentAt: timestamp("sent_at"),
		deliveredAt: timestamp("delivered_at"),
		readAt: timestamp("read_at"),
		failedAt: timestamp("failed_at"),
		errorMessage: text("error_message"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("recipient_campaign_idx").on(table.campaignId),
		index("recipient_contact_idx").on(table.contactId),
		index("recipient_status_idx").on(table.status),
	],
);

// ============================================================================
// WHATSAPP FLOWS
// ============================================================================

export const flows = pgTable(
	"flows",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		wabaId: uuid("waba_id")
			.notNull()
			.references(() => whatsappBusinessAccounts.id, { onDelete: "cascade" }),
		flowId: varchar("flow_id", { length: 255 }).unique(),
		name: varchar("name", { length: 255 }).notNull(),
		status: flowStatusEnum("status").default("draft").notNull(),
		flowJson: jsonb("flow_json"),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("flow_org_idx").on(table.organizationId),
		index("flow_waba_idx").on(table.wabaId),
		index("flow_status_idx").on(table.status),
	],
);

// ============================================================================
// FLOW RESPONSES
// ============================================================================

export const flowResponses = pgTable(
	"flow_responses",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		flowId: uuid("flow_id")
			.notNull()
			.references(() => flows.id, { onDelete: "cascade" }),
		contactId: uuid("contact_id")
			.notNull()
			.references(() => contacts.id, { onDelete: "cascade" }),
		conversationId: uuid("conversation_id").references(() => conversations.id, {
			onDelete: "set null",
		}),
		responseData: jsonb("response_data"),
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("flow_response_flow_idx").on(table.flowId),
		index("flow_response_contact_idx").on(table.contactId),
	],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const whatsappBusinessAccountsRelations = relations(
	whatsappBusinessAccounts,
	({ many }) => ({
		phoneNumbers: many(phoneNumbers),
		messageTemplates: many(messageTemplates),
		flows: many(flows),
	}),
);

export const phoneNumbersRelations = relations(
	phoneNumbers,
	({ one, many }) => ({
		whatsappBusinessAccount: one(whatsappBusinessAccounts, {
			fields: [phoneNumbers.wabaId],
			references: [whatsappBusinessAccounts.id],
		}),
		conversations: many(conversations),
		campaigns: many(campaigns),
	}),
);

export const contactsRelations = relations(contacts, ({ many }) => ({
	subscriptions: many(contactSubscriptions),
	conversations: many(conversations),
	campaignRecipients: many(campaignRecipients),
	flowResponses: many(flowResponses),
	tags: many(contactsToTags),
}));

export const contactTagsRelations = relations(contactTags, ({ many }) => ({
	contacts: many(contactsToTags),
}));

export const contactsToTagsRelations = relations(contactsToTags, ({ one }) => ({
	contact: one(contacts, {
		fields: [contactsToTags.contactId],
		references: [contacts.id],
	}),
	tag: one(contactTags, {
		fields: [contactsToTags.tagId],
		references: [contactTags.id],
	}),
}));

export const contactSubscriptionsRelations = relations(
	contactSubscriptions,
	({ one }) => ({
		contact: one(contacts, {
			fields: [contactSubscriptions.contactId],
			references: [contacts.id],
		}),
	}),
);

export const conversationsRelations = relations(
	conversations,
	({ one, many }) => ({
		contact: one(contacts, {
			fields: [conversations.contactId],
			references: [contacts.id],
		}),
		phoneNumber: one(phoneNumbers, {
			fields: [conversations.phoneNumberId],
			references: [phoneNumbers.id],
		}),
		messages: many(messages),
		flowResponses: many(flowResponses),
	}),
);

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
}));

export const messageTemplatesRelations = relations(
	messageTemplates,
	({ one, many }) => ({
		whatsappBusinessAccount: one(whatsappBusinessAccounts, {
			fields: [messageTemplates.wabaId],
			references: [whatsappBusinessAccounts.id],
		}),
		campaigns: many(campaigns),
	}),
);

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
	phoneNumber: one(phoneNumbers, {
		fields: [campaigns.phoneNumberId],
		references: [phoneNumbers.id],
	}),
	template: one(messageTemplates, {
		fields: [campaigns.templateId],
		references: [messageTemplates.id],
	}),
	recipients: many(campaignRecipients),
}));

export const campaignRecipientsRelations = relations(
	campaignRecipients,
	({ one }) => ({
		campaign: one(campaigns, {
			fields: [campaignRecipients.campaignId],
			references: [campaigns.id],
		}),
		contact: one(contacts, {
			fields: [campaignRecipients.contactId],
			references: [contacts.id],
		}),
		message: one(messages, {
			fields: [campaignRecipients.messageId],
			references: [messages.id],
		}),
	}),
);

export const flowsRelations = relations(flows, ({ one, many }) => ({
	whatsappBusinessAccount: one(whatsappBusinessAccounts, {
		fields: [flows.wabaId],
		references: [whatsappBusinessAccounts.id],
	}),
	responses: many(flowResponses),
}));

export const flowResponsesRelations = relations(flowResponses, ({ one }) => ({
	flow: one(flows, {
		fields: [flowResponses.flowId],
		references: [flows.id],
	}),
	contact: one(contacts, {
		fields: [flowResponses.contactId],
		references: [contacts.id],
	}),
	conversation: one(conversations, {
		fields: [flowResponses.conversationId],
		references: [conversations.id],
	}),
}));
