import { queryOptions } from "@tanstack/react-query";
import { getTemplates } from "@/server/templates";

export const templatesQueryOptions = (search: string, page: number) =>
	queryOptions({
		queryKey: ["templates", { search, page }],
		queryFn: () =>
			getTemplates({
				data: { search, page, pageSize: 20 },
			}),
	});

// Base query key for invalidating all templates queries
export const templatesQueryKey = ["templates"] as const;
