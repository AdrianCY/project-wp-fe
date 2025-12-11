import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContactTag, ContactWithTags } from "@/server/contacts";

export interface ContactsTableMeta {
	onDelete: (id: string) => void;
	isDeleting?: boolean;
}

export const columns: ColumnDef<ContactWithTags>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "name",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="-ml-4"
			>
				Name
				<ArrowUpDown className="ml-2 size-4" />
			</Button>
		),
		cell: ({ row }) => {
			const name = row.getValue("name") as string | null;
			return (
				<div className="font-medium">
					{name || <span className="text-muted-foreground">—</span>}
				</div>
			);
		},
	},
	{
		accessorKey: "phoneNumber",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="-ml-4"
			>
				Phone Number
				<ArrowUpDown className="ml-2 size-4" />
			</Button>
		),
		cell: ({ row }) => {
			const phone = row.getValue("phoneNumber") as string;
			return <div className="font-mono text-sm">{phone}</div>;
		},
	},
	{
		accessorKey: "email",
		header: "Email",
		cell: ({ row }) => {
			const email = row.getValue("email") as string | null;
			return email || <span className="text-muted-foreground">—</span>;
		},
	},
	{
		accessorKey: "tags",
		header: "Tags",
		cell: ({ row }) => {
			const tags = row.getValue("tags") as ContactTag[];
			if (!tags || tags.length === 0) {
				return <span className="text-muted-foreground">—</span>;
			}
			return (
				<div className="flex flex-wrap gap-1">
					{tags.slice(0, 3).map((tag) => (
						<Badge
							key={tag.id}
							variant="secondary"
							className="text-xs"
							style={{
								backgroundColor: tag.color ? `${tag.color}20` : undefined,
								color: tag.color || undefined,
								borderColor: tag.color || undefined,
							}}
						>
							{tag.name}
						</Badge>
					))}
					{tags.length > 3 && (
						<Badge variant="outline" className="text-xs">
							+{tags.length - 3}
						</Badge>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="-ml-4"
			>
				Created
				<ArrowUpDown className="ml-2 size-4" />
			</Button>
		),
		cell: ({ row }) => {
			const date = row.getValue("createdAt") as Date;
			return (
				<div className="text-muted-foreground text-sm">
					{new Date(date).toLocaleDateString()}
				</div>
			);
		},
	},
	{
		id: "actions",
		enableHiding: false,
		cell: ({ row, table }) => {
			const contact = row.original;
			const meta = table.options.meta as ContactsTableMeta;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="size-8 p-0">
							<span className="sr-only">Open menu</span>
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<Link
								to="/app/contacts/$contactId"
								params={{ contactId: contact.id }}
							>
								<Eye className="mr-2 size-4" />
								View
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link
								to="/app/contacts/$contactId"
								params={{ contactId: contact.id }}
							>
								<Pencil className="mr-2 size-4" />
								Edit
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={() => meta.onDelete(contact.id)}
							disabled={meta.isDeleting}
						>
							<Trash2 className="mr-2 size-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];
