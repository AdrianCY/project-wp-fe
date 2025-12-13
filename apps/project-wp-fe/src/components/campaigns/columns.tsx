import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, MoreHorizontal, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Campaign } from "@/server/campaigns";

interface CampaignColumnsProps {
	onDelete: (id: string) => void;
	onSend: (id: string) => void;
}

export function getCampaignColumns({
	onDelete,
	onSend,
}: CampaignColumnsProps): ColumnDef<Campaign>[] {
	return [
		{
			accessorKey: "name",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Name
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				);
			},
			cell: ({ row }) => (
				<div className="flex flex-col">
					<Link
						to="/app/campaigns/$campaignId"
						params={{ campaignId: row.original.id }}
						className="font-medium hover:underline"
					>
						{row.getValue("name")}
					</Link>
					{row.original.description && (
						<span className="text-xs text-muted-foreground line-clamp-1">
							{row.original.description}
						</span>
					)}
				</div>
			),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = row.getValue("status") as string;
				let variant: "default" | "secondary" | "destructive" | "outline" =
					"default";

				switch (status) {
					case "completed":
						variant = "default";
						break;
					case "running":
						variant = "secondary";
						break;
					case "scheduled":
						variant = "outline";
						break;
					case "draft":
						variant = "outline";
						break;
					case "cancelled":
					case "paused":
						variant = "destructive";
						break;
					default:
						variant = "outline";
				}

				return (
					<Badge variant={variant} className="capitalize">
						{status}
					</Badge>
				);
			},
		},
		{
			accessorKey: "totalRecipients",
			header: "Recipients",
			cell: ({ row }) => {
				const total = row.original.totalRecipients || 0;
				return <div className="text-sm">{total.toLocaleString()}</div>;
			},
		},
		{
			id: "stats",
			header: "Delivery",
			cell: ({ row }) => {
				const sent = row.original.sentCount || 0;
				const failed = row.original.failedCount || 0;
				const total = row.original.totalRecipients || 0;

				if (
					row.original.status === "draft" ||
					row.original.status === "scheduled"
				) {
					return <span className="text-xs text-muted-foreground">-</span>;
				}

				return (
					<div className="flex items-center gap-2 text-xs">
						<span title="Sent">
							{sent}/{total}
						</span>
						{failed > 0 && (
							<span className="text-destructive" title="Failed">
								({failed} failed)
							</span>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "scheduledAt",
			header: "Schedule",
			cell: ({ row }) => {
				const scheduledAt = row.getValue("scheduledAt") as Date | null;
				if (!scheduledAt) {
					return <span className="text-xs text-muted-foreground">-</span>;
				}
				return (
					<div className="text-sm">
						{new Date(scheduledAt).toLocaleString(undefined, {
							dateStyle: "short",
							timeStyle: "short",
						})}
					</div>
				);
			},
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Created
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				);
			},
			cell: ({ row }) => {
				const date = new Date(row.getValue("createdAt"));
				return <div className="text-sm">{date.toLocaleDateString()}</div>;
			},
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const campaign = row.original;
				const canSend = ["draft", "scheduled"].includes(campaign.status);
				const canDelete = [
					"draft",
					"scheduled",
					"completed",
					"cancelled",
				].includes(campaign.status);

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem asChild>
								<Link
									to="/app/campaigns/$campaignId"
									params={{ campaignId: campaign.id }}
								>
									<Eye className="mr-2 h-4 w-4" />
									View Details
								</Link>
							</DropdownMenuItem>
							{canSend && (
								<DropdownMenuItem onClick={() => onSend(campaign.id)}>
									<Play className="mr-2 h-4 w-4" />
									Send Now
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							{canDelete && (
								<DropdownMenuItem
									onClick={() => onDelete(campaign.id)}
									className="text-destructive focus:text-destructive"
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];
}
