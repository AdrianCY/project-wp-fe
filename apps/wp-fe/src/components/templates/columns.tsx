import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
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
import type { Template } from "@/server/templates";

export const columns: ColumnDef<Template>[] = [
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
				<span className="font-medium">{row.getValue("name")}</span>
				<span className="text-xs text-muted-foreground">
					{row.original.templateId || "No ID"}
				</span>
			</div>
		),
	},
	{
		accessorKey: "category",
		header: "Category",
		cell: ({ row }) => {
			const category = row.getValue("category") as string;
			return <div className="capitalize">{category.toLowerCase()}</div>;
		},
	},
	{
		accessorKey: "language",
		header: "Language",
		cell: ({ row }) => {
			return (
				<div className="font-mono text-sm uppercase">
					{row.getValue("language")}
				</div>
			);
		},
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			let variant: "default" | "secondary" | "destructive" | "outline" =
				"default";

			switch (status) {
				case "approved":
					variant = "default"; // Green-ish usually, or default primary
					break;
				case "rejected":
				case "disabled":
				case "paused":
					variant = "destructive";
					break;
				case "pending":
					variant = "secondary";
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
		accessorKey: "updatedAt",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Last Updated
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const date = new Date(row.getValue("updatedAt"));
			return <div className="text-sm">{date.toLocaleDateString()}</div>;
		},
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const template = row.original;

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
						<DropdownMenuItem
							onClick={() => navigator.clipboard.writeText(template.id)}
						>
							Copy ID
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem disabled>Sync Status</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];
