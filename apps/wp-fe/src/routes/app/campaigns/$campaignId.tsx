import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	ArrowLeft,
	CheckCircle,
	Clock,
	Mail,
	MailOpen,
	Play,
	RefreshCw,
	Trash2,
	Users,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	campaignQueryKey,
	campaignQueryOptions,
	campaignsQueryKey,
} from "@/queries/campaigns";
import {
	deleteCampaign,
	resendAllFailedRecipients,
	resendFailedRecipient,
	sendCampaign,
} from "@/server/campaigns";

export const Route = createFileRoute("/app/campaigns/$campaignId")({
	loader: ({ params, context }) => {
		return context.queryClient.ensureQueryData(
			campaignQueryOptions(params.campaignId),
		);
	},
	pendingComponent: CampaignDetailSkeleton,
	component: CampaignDetailPage,
});

function CampaignDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Skeleton className="h-9 w-20" />
				<div className="space-y-2">
					<Skeleton className="h-9 w-64" />
					<Skeleton className="h-5 w-40" />
				</div>
			</div>
			<div className="grid gap-4 md:grid-cols-5">
				{Array.from({ length: 5 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton list
					<Card key={i}>
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-20" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-16" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{Array.from({ length: 5 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton list
							<div key={i} className="flex items-center gap-4 py-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-6 w-20 rounded-full" />
								<Skeleton className="h-4 w-32" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function CampaignDetailPage() {
	const router = useRouter();
	const { campaignId } = Route.useParams();
	const { queryClient } = Route.useRouteContext();
	const { data: campaign } = useSuspenseQuery(campaignQueryOptions(campaignId));

	const [isSending, setIsSending] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [resendingRecipientId, setResendingRecipientId] = useState<
		string | null
	>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showSendDialog, setShowSendDialog] = useState(false);

	const sendCampaignFn = useServerFn(sendCampaign);
	const deleteCampaignFn = useServerFn(deleteCampaign);
	const resendFailedRecipientFn = useServerFn(resendFailedRecipient);
	const resendAllFailedFn = useServerFn(resendAllFailedRecipients);

	if (!campaign) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<h2 className="text-xl font-semibold">Campaign not found</h2>
				<p className="text-muted-foreground mt-2">
					The campaign you're looking for doesn't exist.
				</p>
				<Button asChild className="mt-4">
					<Link to="/app/campaigns">Back to Campaigns</Link>
				</Button>
			</div>
		);
	}

	const handleSend = async () => {
		setIsSending(true);
		try {
			const result = await sendCampaignFn({ data: campaignId });
			toast.success(result.message);
			await queryClient.invalidateQueries({
				queryKey: campaignQueryKey(campaignId),
			});
			await queryClient.invalidateQueries({
				queryKey: campaignsQueryKey,
			});
			setShowSendDialog(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to send campaign",
			);
		} finally {
			setIsSending(false);
		}
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteCampaignFn({ data: campaignId });
			toast.success("Campaign deleted successfully");
			await queryClient.invalidateQueries({
				queryKey: campaignsQueryKey,
			});
			router.navigate({ to: "/app/campaigns" });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete campaign",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleResendOne = async (recipientId: string) => {
		setResendingRecipientId(recipientId);
		try {
			const result = await resendFailedRecipientFn({
				data: { campaignId, recipientId },
			});
			if (result.success) {
				toast.success(result.message);
			} else {
				toast.error(result.message);
			}
			await queryClient.invalidateQueries({
				queryKey: campaignQueryKey(campaignId),
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to resend message",
			);
		} finally {
			setResendingRecipientId(null);
		}
	};

	const handleResendAllFailed = async () => {
		setIsResending(true);
		try {
			const result = await resendAllFailedFn({ data: campaignId });
			toast.success(result.message);
			await queryClient.invalidateQueries({
				queryKey: campaignQueryKey(campaignId),
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to resend messages",
			);
		} finally {
			setIsResending(false);
		}
	};

	const getStatusBadgeVariant = (
		status: string,
	): "default" | "secondary" | "destructive" | "outline" => {
		switch (status) {
			case "completed":
			case "delivered":
			case "read":
				return "default";
			case "running":
			case "sent":
				return "secondary";
			case "failed":
			case "cancelled":
				return "destructive";
			default:
				return "outline";
		}
	};

	const canSend = ["draft", "scheduled"].includes(campaign.status);
	const canDelete = ["draft", "scheduled", "completed", "cancelled"].includes(
		campaign.status,
	);

	const stats = [
		{
			label: "Total Recipients",
			value: campaign.totalRecipients || 0,
			icon: Users,
		},
		{
			label: "Sent",
			value: campaign.sentCount || 0,
			icon: Mail,
		},
		{
			label: "Delivered",
			value: campaign.deliveredCount || 0,
			icon: CheckCircle,
		},
		{
			label: "Read",
			value: campaign.readCount || 0,
			icon: MailOpen,
		},
		{
			label: "Failed",
			value: campaign.failedCount || 0,
			icon: XCircle,
		},
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.navigate({ to: "/app/campaigns" })}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back
					</Button>
					<div>
						<div className="flex items-center gap-3">
							<h1 className="text-3xl font-bold tracking-tight">
								{campaign.name}
							</h1>
							<Badge variant={getStatusBadgeVariant(campaign.status)}>
								{campaign.status}
							</Badge>
						</div>
						{campaign.description && (
							<p className="text-muted-foreground">{campaign.description}</p>
						)}
					</div>
				</div>
				<div className="flex gap-2">
					{canSend && (
						<Button
							onClick={() => setShowSendDialog(true)}
							disabled={isSending}
						>
							<Play className="mr-2 h-4 w-4" />
							{isSending ? "Sending..." : "Send Now"}
						</Button>
					)}
					{canDelete && (
						<Button
							variant="outline"
							onClick={() => setShowDeleteDialog(true)}
							disabled={isDeleting}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Delete
						</Button>
					)}
				</div>
			</div>

			{/* Campaign Info */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Template
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-semibold">
							{campaign.template?.name || "Unknown"}
						</div>
						<div className="text-sm text-muted-foreground">
							{campaign.template?.language}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Sender
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-semibold">
							{campaign.phoneNumber?.displayName || "Unknown"}
						</div>
						{campaign.phoneNumber?.phoneNumber && (
							<div className="text-sm text-muted-foreground font-mono">
								{campaign.phoneNumber.phoneNumber}
							</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Created
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-semibold">
							{new Date(campaign.createdAt).toLocaleDateString()}
						</div>
						<div className="text-sm text-muted-foreground">
							{new Date(campaign.createdAt).toLocaleTimeString()}
						</div>
					</CardContent>
				</Card>
				{campaign.scheduledAt && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
								<Clock className="h-4 w-4" />
								Scheduled
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-semibold">
								{new Date(campaign.scheduledAt).toLocaleDateString()}
							</div>
							<div className="text-sm text-muted-foreground">
								{new Date(campaign.scheduledAt).toLocaleTimeString()}
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-5">
				{stats.map((stat) => (
					<Card key={stat.label}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{stat.label}
							</CardTitle>
							<stat.icon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{stat.value.toLocaleString()}
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Recipients Table */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Recipients</CardTitle>
					{(campaign.failedCount ?? 0) > 0 && (
						<Button
							size="sm"
							variant="outline"
							onClick={handleResendAllFailed}
							disabled={isResending}
						>
							<RefreshCw
								className={`mr-2 h-4 w-4 ${isResending ? "animate-spin" : ""}`}
							/>
							{isResending
								? "Resending..."
								: `Resend All Failed (${campaign.failedCount})`}
						</Button>
					)}
				</CardHeader>
				<CardContent>
					{campaign.recipients && campaign.recipients.length > 0 ? (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Contact</TableHead>
										<TableHead>Phone Number</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Sent At</TableHead>
										<TableHead>Delivered At</TableHead>
										<TableHead>Read At</TableHead>
										<TableHead>Error</TableHead>
										<TableHead className="w-[80px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{campaign.recipients.map((recipient) => (
										<TableRow key={recipient.id}>
											<TableCell className="font-medium">
												{recipient.contactName || "-"}
											</TableCell>
											<TableCell>{recipient.contactPhone}</TableCell>
											<TableCell>
												<Badge
													variant={getStatusBadgeVariant(recipient.status)}
												>
													{recipient.status}
												</Badge>
											</TableCell>
											<TableCell>
												{recipient.sentAt
													? new Date(recipient.sentAt).toLocaleString()
													: "-"}
											</TableCell>
											<TableCell>
												{recipient.deliveredAt
													? new Date(recipient.deliveredAt).toLocaleString()
													: "-"}
											</TableCell>
											<TableCell>
												{recipient.readAt
													? new Date(recipient.readAt).toLocaleString()
													: "-"}
											</TableCell>
											<TableCell className="text-destructive">
												{recipient.errorMessage || "-"}
											</TableCell>
											<TableCell>
												{recipient.status === "failed" && (
													<Button
														size="sm"
														variant="ghost"
														onClick={() => handleResendOne(recipient.id)}
														disabled={resendingRecipientId === recipient.id}
													>
														<RefreshCw
															className={`h-4 w-4 ${
																resendingRecipientId === recipient.id
																	? "animate-spin"
																	: ""
															}`}
														/>
													</Button>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : (
						<div className="text-center py-8 text-muted-foreground">
							No recipients yet.
						</div>
					)}
				</CardContent>
			</Card>

			{/* Send Dialog */}
			<AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Send Campaign Now</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to send this campaign now? Messages will be
							sent to {campaign.totalRecipients?.toLocaleString()} recipient
							{campaign.totalRecipients !== 1 ? "s" : ""} immediately.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleSend();
							}}
							disabled={isSending}
						>
							{isSending ? "Sending..." : "Send Now"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
								handleDelete();
							}}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
