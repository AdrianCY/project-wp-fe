import { queryOptions } from "@tanstack/react-query";
import { getContactById, getContacts, getTags } from "@/server/contacts";

export const contactsQueryOptions = (
	search: string,
	page: number,
	tagIds?: string[],
) =>
	queryOptions({
		queryKey: ["contacts", { search, page, tagIds }],
		queryFn: () =>
			getContacts({
				data: { search, page, pageSize: 20, tagIds },
			}),
	});

export const contactQueryOptions = (contactId: string) =>
	queryOptions({
		queryKey: ["contact", contactId],
		queryFn: () => getContactById({ data: contactId }),
	});

export const tagsQueryOptions = () =>
	queryOptions({
		queryKey: ["contact-tags"],
		queryFn: () => getTags(),
	});

// Base query keys for invalidating queries
export const contactsQueryKey = ["contacts"] as const;
export const contactQueryKey = (contactId: string) =>
	["contact", contactId] as const;
export const tagsQueryKey = ["contact-tags"] as const;
