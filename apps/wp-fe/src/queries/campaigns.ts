import { queryOptions } from "@tanstack/react-query";
import {
	getAllTags,
	getApprovedTemplates,
	getCampaignById,
	getCampaigns,
	getPhoneNumbers,
} from "@/server/campaigns";

// ============================================================================
// CAMPAIGNS LIST
// ============================================================================

export const campaignsQueryOptions = (search: string, page: number) =>
	queryOptions({
		queryKey: ["campaigns", { search, page }],
		queryFn: () =>
			getCampaigns({
				data: { search, page, pageSize: 20 },
			}),
	});

// Base query key for invalidating all campaigns queries
export const campaignsQueryKey = ["campaigns"] as const;

// ============================================================================
// CAMPAIGN DETAIL
// ============================================================================

export const campaignQueryOptions = (campaignId: string) =>
	queryOptions({
		queryKey: ["campaign", campaignId],
		queryFn: () => getCampaignById({ data: campaignId }),
	});

export const campaignQueryKey = (campaignId: string) =>
	["campaign", campaignId] as const;

// ============================================================================
// CAMPAIGN CREATE PAGE DATA
// ============================================================================

export const phoneNumbersQueryOptions = () =>
	queryOptions({
		queryKey: ["phoneNumbers"],
		queryFn: () => getPhoneNumbers(),
	});

export const approvedTemplatesQueryOptions = () =>
	queryOptions({
		queryKey: ["approvedTemplates"],
		queryFn: () => getApprovedTemplates(),
	});

export const tagsForCampaignQueryOptions = () =>
	queryOptions({
		queryKey: ["tagsForCampaign"],
		queryFn: () => getAllTags(),
	});
