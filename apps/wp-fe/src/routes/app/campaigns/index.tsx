import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CampaignListSkeleton } from "@/components/campaigns/campaign-list-skeleton";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { campaignsQueryKey, campaignsQueryOptions } from "@/queries/campaigns";
import { deleteCampaign, sendCampaign } from "@/server/campaigns";

export const Route = createFileRoute("/app/campaigns/")({
	loaderDeps: ({ search }) => ({
		search: (search as { q?: string }).q || "",
		page: (search as { page?: number }).page || 1,
	}),
	loader: ({ deps, context }) => {
		return context.queryClient.ensureQueryData(
			campaignsQueryOptions(deps.search, deps.page),
		);
	},
	pendingComponent: CampaignListSkeleton,
	component: CampaignsPage,
});

function CampaignsPage() {
	const router = useRouter();
	const { queryClient } = Route.useRouteContext();
	const { search, page } = Route.useLoaderDeps();
	const { data } = useSuspenseQuery(campaignsQueryOptions(search, page));
	const [searchInput, setSearchInput] = useState(search);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [isSending, setIsSending] = useState(false);
	const [sendId, setSendId] = useState<string | null>(null);

	const deleteCampaignFn = useServerFn(deleteCampaign);
	const sendCampaignFn = useServerFn(sendCampaign);

	const handleSearch = (value: string) => {
		setSearchInput(value);
	};

	const executeSearch = () => {
		router.navigate({
			to: "/app/campaigns",
			search: { q: searchInput || undefined, page: 1 },
		});
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			executeSearch();
		}
	};

	const handlePageChange = (newPage: number) => {
		router.navigate({
			to: "/app/campaigns",
			search: { q: search || undefined, page: newPage },
		});
	};

	const handleDelete = (id: string) => {
		setDeleteId(id);
	};

	const confirmDelete = async () => {
		if (!deleteId) return;
		setIsDeleting(true);
		try {
			await deleteCampaignFn({ data: deleteId });
			await queryClient.invalidateQueries({
				queryKey: campaignsQueryKey,
			});
			toast.success("Campaign deleted successfully");
			setDeleteId(null);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete campaign",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleSend = (id: string) => {
		setSendId(id);
	};

	const confirmSend = async () => {
		if (!sendId) return;
		setIsSending(true);
		try {
			const result = await sendCampaignFn({ data: sendId });
			await queryClient.invalidateQueries({
				queryKey: campaignsQueryKey,
			});
			toast.success(result.message);
			setSendId(null);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to send campaign",
			);
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
					<p className="text-muted-foreground">
						Send WhatsApp message templates to your contacts.
					</p>
				</div>
				<Button asChild>
					<Link to="/app/campaigns/create">
						<Plus className="mr-2 h-4 w-4" />
						Create Campaign
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-4">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search campaigns by name..."
								value={searchInput}
								onChange={(e) => handleSearch(e.target.value)}
								onKeyDown={handleKeyDown}
								onBlur={executeSearch}
								className="pl-10"
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{data.campaigns && data.campaigns.length > 0 ? (
						<CampaignsTable
							data={data.campaigns}
							page={data.page}
							pageSize={data.pageSize}
							pageCount={data.totalPages}
							onPageChange={handlePageChange}
							onDelete={handleDelete}
							onSend={handleSend}
						/>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="rounded-full bg-muted p-4">
								<Megaphone className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="mt-4 text-lg font-semibold">No campaigns found</h3>
							<p className="mt-2 max-w-sm text-sm text-muted-foreground">
								{search
									? "No campaigns match your search."
									: "Create your first campaign to start sending messages to your contacts."}
							</p>
							{!search && (
								<Button className="mt-4" asChild>
									<Link to="/app/campaigns/create">
										<Plus className="mr-2 h-4 w-4" />
										Create Campaign
									</Link>
								</Button>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={!!deleteId}
				onOpenChange={(open) => !open && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Campaign</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this campaign? This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								confirmDelete();
							}}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Send Confirmation Dialog */}
			<AlertDialog
				open={!!sendId}
				onOpenChange={(open) => !open && setSendId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Send Campaign Now</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to send this campaign now? Messages will be
							sent to all recipients immediately.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								confirmSend();
							}}
							disabled={isSending}
						>
							{isSending ? "Sending..." : "Send Now"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
