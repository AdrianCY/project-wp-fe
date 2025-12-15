/** biome-ignore-all lint/complexity/noBannedTypes: we use this to ignore the type errors */
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { contacts, contactsToTags, contactTags } from "wp-db";
import { db } from "@/db";
import { authMiddleware } from "@/server/middleware/auth";

// ============================================================================
// TYPES
// ============================================================================

export type Contact = typeof contacts.$inferSelect;
export type ContactTag = typeof contactTags.$inferSelect;

export type ContactWithTags = Contact & {
	tags: ContactTag[];
};

export type ContactsListParams = {
	page?: number;
	pageSize?: number;
	search?: string;
	tagIds?: string[];
	sortBy?: "name" | "phoneNumber" | "createdAt";
	sortOrder?: "asc" | "desc";
};

export type ContactsListResult = {
	contacts: ContactWithTags[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export type CreateContactInput = {
	phoneNumber: string;
	name?: string;
	email?: string;
	tagIds?: string[];
};

export type UpdateContactInput = {
	id: string;
	phoneNumber?: string;
	name?: string;
	email?: string;
	tagIds?: string[];
};

// ============================================================================
// HELPER: Get tags for a contact
// ============================================================================

async function getTagsForContact(contactId: string): Promise<ContactTag[]> {
	const tagRelations = await db
		.select({ tag: contactTags })
		.from(contactsToTags)
		.innerJoin(contactTags, eq(contactsToTags.tagId, contactTags.id))
		.where(eq(contactsToTags.contactId, contactId));

	return tagRelations.map((r) => r.tag);
}

// ============================================================================
// CONTACTS CRUD
// ============================================================================

/**
 * Get paginated list of contacts with optional search and filtering
 */
export const getContacts = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator((params: ContactsListParams) => params)
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return { contacts: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
		}

		const {
			page = 1,
			pageSize = 20,
			search,
			tagIds,
			sortBy = "createdAt",
			sortOrder = "desc",
		} = data;

		const offset = (page - 1) * pageSize;

		// Build where conditions
		const conditions = [
			eq(contacts.organizationId, organizationId),
			isNull(contacts.deletedAt),
		];

		if (search) {
			const searchCondition = or(
				ilike(contacts.name, `%${search}%`),
				ilike(contacts.phoneNumber, `%${search}%`),
				ilike(contacts.email, `%${search}%`),
			);
			if (searchCondition) {
				conditions.push(searchCondition);
			}
		}

		// Get total count
		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(contacts)
			.where(and(...conditions));
		const total = Number(countResult[0]?.count ?? 0);

		// Build sort
		const sortColumn =
			sortBy === "name"
				? contacts.name
				: sortBy === "phoneNumber"
					? contacts.phoneNumber
					: contacts.createdAt;
		const orderFn = sortOrder === "asc" ? asc : desc;

		// Get contacts
		const contactsList = await db
			.select()
			.from(contacts)
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(pageSize)
			.offset(offset);

		// Get tags for each contact
		const contactsWithTags = await Promise.all(
			contactsList.map(async (contact) => ({
				...contact,
				metadata: contact.metadata as Record<string, {}> | null,
				tags: await getTagsForContact(contact.id),
			})),
		);

		// Filter by tags if specified (after fetching)
		let filteredContacts = contactsWithTags;
		if (tagIds && tagIds.length > 0) {
			filteredContacts = contactsWithTags.filter((contact) =>
				contact.tags.some((tag) => tagIds.includes(tag.id)),
			);
		}

		return {
			contacts: filteredContacts,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	});

/**
 * Get a single contact by ID
 */
export const getContactById = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator((id: string) => id)
	.handler(async ({ data: id, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return null;
		}

		const contact = await db.query.contacts.findFirst({
			where: and(
				eq(contacts.id, id),
				eq(contacts.organizationId, organizationId),
				isNull(contacts.deletedAt),
			),
		});

		if (!contact) {
			return null;
		}

		return {
			...contact,
			metadata: contact.metadata as Record<string, {}> | null,
			tags: await getTagsForContact(contact.id),
		};
	});

/**
 * Create a new contact
 */
export const createContact = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((input: CreateContactInput) => {
		if (!input.phoneNumber) {
			throw new Error("Phone number is required");
		}
		return input;
	})
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return null;
		}

		const { phoneNumber, name, email, tagIds } = data;

		// Create the contact
		const [newContact] = await db
			.insert(contacts)
			.values({
				organizationId,
				phoneNumber,
				name: name || null,
				email: email || null,
			})
			.returning();

		// Add tags if provided
		if (tagIds && tagIds.length > 0) {
			await db.insert(contactsToTags).values(
				tagIds.map((tagId: string) => ({
					contactId: newContact.id,
					tagId,
				})),
			);
		}

		// Return contact with tags
		return {
			...newContact,
			metadata: newContact.metadata as Record<string, {}> | null,
			tags: await getTagsForContact(newContact.id),
		};
	});

/**
 * Update an existing contact
 */
export const updateContact = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((input: UpdateContactInput) => {
		if (!input.id) {
			throw new Error("Contact ID is required");
		}
		return input;
	})
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return null;
		}

		const { id, phoneNumber, name, email, tagIds } = data;

		// Verify contact belongs to organization
		const existing = await db.query.contacts.findFirst({
			where: and(
				eq(contacts.id, id),
				eq(contacts.organizationId, organizationId),
				isNull(contacts.deletedAt),
			),
		});

		if (!existing) {
			return null;
		}

		// Update contact
		const [updated] = await db
			.update(contacts)
			.set({
				phoneNumber: phoneNumber ?? existing.phoneNumber,
				name: name !== undefined ? name || null : existing.name,
				email: email !== undefined ? email || null : existing.email,
				updatedAt: new Date(),
			})
			.where(eq(contacts.id, id))
			.returning();

		// Update tags if provided
		if (tagIds !== undefined) {
			// Remove existing tags
			await db.delete(contactsToTags).where(eq(contactsToTags.contactId, id));

			// Add new tags
			if (tagIds.length > 0) {
				await db.insert(contactsToTags).values(
					tagIds.map((tagId: string) => ({
						contactId: id,
						tagId,
					})),
				);
			}
		}

		return {
			...updated,
			metadata: updated.metadata as Record<string, {}> | null,
			tags: await getTagsForContact(id),
		};
	});

/**
 * Soft delete a contact
 */
export const deleteContact = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((id: string) => {
		if (!id) {
			throw new Error("Contact ID is required");
		}
		return id;
	})
	.handler(async ({ data: id, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return false;
		}

		// Verify contact belongs to organization
		const existing = await db.query.contacts.findFirst({
			where: and(
				eq(contacts.id, id),
				eq(contacts.organizationId, organizationId),
				isNull(contacts.deletedAt),
			),
		});

		if (!existing) {
			return false;
		}

		// Soft delete
		await db
			.update(contacts)
			.set({
				deletedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(contacts.id, id));

		return true;
	});

// ============================================================================
// TAGS CRUD
// ============================================================================

/**
 * Get all tags for the organization
 */
export const getTags = createServerFn({ method: "GET" })
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

/**
 * Create a new tag
 */
export const createTag = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((input: { name: string; color?: string }) => {
		if (!input.name) {
			throw new Error("Tag name is required");
		}
		return input;
	})
	.handler(async ({ data, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return null;
		}

		const [newTag] = await db
			.insert(contactTags)
			.values({
				organizationId,
				name: data.name,
				color: data.color || "#6b7280",
			})
			.returning();

		return newTag;
	});

/**
 * Delete a tag
 */
export const deleteTag = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((id: string) => {
		if (!id) {
			throw new Error("Tag ID is required");
		}
		return id;
	})
	.handler(async ({ data: id, context }) => {
		const organizationId = context.session.session.activeOrganizationId;
		if (!organizationId) {
			return false;
		}

		// Verify tag belongs to organization
		const existing = await db.query.contactTags.findFirst({
			where: and(
				eq(contactTags.id, id),
				eq(contactTags.organizationId, organizationId),
			),
		});

		if (!existing) {
			return false;
		}

		// Delete tag (cascade will remove contactsToTags entries)
		await db.delete(contactTags).where(eq(contactTags.id, id));

		return true;
	});
