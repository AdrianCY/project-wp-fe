import { and, eq } from "drizzle-orm";
import {
	contacts,
	conversations,
	messages,
	phoneNumbers,
	whatsappBusinessAccounts,
} from "wp-db";
import { db } from "@/db";
import type {
	MessageChangeValue,
	WebhookMessage,
	WebhookStatus,
} from "./types";

/**
 * Process incoming WhatsApp messages
 */
export async function handleIncomingMessages(
	wabaId: string,
	value: MessageChangeValue,
) {
	const { contacts: waContacts, messages: waMessages, metadata } = value;

	if (!waMessages?.length) return;

	// Find WABA
	const waba = await db.query.whatsappBusinessAccounts.findFirst({
		where: eq(whatsappBusinessAccounts.wabaId, wabaId),
	});

	if (!waba) {
		console.warn(`[Webhook] Unknown WABA: ${wabaId}`);
		return;
	}

	// Find phone number
	const phoneNumber = await db.query.phoneNumbers.findFirst({
		where: eq(phoneNumbers.phoneNumberId, metadata.phone_number_id),
	});

	if (!phoneNumber) {
		console.warn(`[Webhook] Unknown phone: ${metadata.phone_number_id}`);
		return;
	}

	for (const message of waMessages) {
		const waContact = waContacts?.find((c) => c.wa_id === message.from);

		// Find or create contact
		let contact = await db.query.contacts.findFirst({
			where: and(
				eq(contacts.organizationId, waba.organizationId),
				eq(contacts.phoneNumber, message.from),
			),
		});

		if (!contact) {
			const [newContact] = await db
				.insert(contacts)
				.values({
					organizationId: waba.organizationId,
					phoneNumber: message.from,
					waId: message.from,
					name: waContact?.profile?.name || null,
				})
				.returning();
			contact = newContact;
		} else if (waContact?.profile?.name && !contact.name) {
			await db
				.update(contacts)
				.set({ name: waContact.profile.name, updatedAt: new Date() })
				.where(eq(contacts.id, contact.id));
		}

		// Find or create conversation
		let conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.contactId, contact.id),
				eq(conversations.phoneNumberId, phoneNumber.id),
			),
		});

		const messageTimestamp = new Date(
			Number.parseInt(message.timestamp, 10) * 1000,
		);
		const windowExpiry = new Date(
			messageTimestamp.getTime() + 24 * 60 * 60 * 1000,
		);

		if (!conversation) {
			const [newConversation] = await db
				.insert(conversations)
				.values({
					organizationId: waba.organizationId,
					contactId: contact.id,
					phoneNumberId: phoneNumber.id,
					lastMessageAt: messageTimestamp,
					windowExpiresAt: windowExpiry,
					isOpen: true,
				})
				.returning();
			conversation = newConversation;
		} else {
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

		// Build message content
		const content = buildMessageContent(message);

		// Store message
		await db
			.insert(messages)
			.values({
				conversationId: conversation.id,
				wamid: message.id,
				direction: "inbound",
				type: message.type as typeof messages.$inferInsert.type,
				content,
				status: "delivered",
				sentAt: messageTimestamp,
				deliveredAt: messageTimestamp,
			})
			.onConflictDoNothing();
	}
}

/**
 * Process message status updates (sent, delivered, read, failed)
 */
export async function handleStatusUpdates(statuses: WebhookStatus[]) {
	for (const status of statuses) {
		const timestamp = new Date(Number.parseInt(status.timestamp, 10) * 1000);
		const updateData: Record<string, unknown> = {
			status: status.status,
			updatedAt: new Date(),
		};

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

/**
 * Build message content object based on message type
 */
function buildMessageContent(message: WebhookMessage): Record<string, unknown> {
	switch (message.type) {
		case "text":
			return { body: message.text?.body };
		case "image":
			return { ...message.image };
		case "video":
			return { ...message.video };
		case "audio":
			return { ...message.audio };
		case "document":
			return { ...message.document };
		case "location":
			return { ...message.location };
		case "contacts":
			return { contacts: message.contacts };
		case "interactive":
			return { ...message.interactive };
		case "reaction":
			return { ...message.reaction };
		case "button":
			return { ...message.button };
		default:
			return { raw: message };
	}
}
