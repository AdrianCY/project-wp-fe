import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { CreateContactDialog } from "@/components/contacts/create-contact-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteContact, getContacts } from "@/server/contacts";

export const Route = createFileRoute("/app/contacts/")({
	loaderDeps: ({ search }) => ({
		search: (search as { q?: string }).q || "",
		page: (search as { page?: number }).page || 1,
	}),
	loader: async ({ deps }) => {
		const result = await getContacts({
			data: { search: deps.search, page: deps.page, pageSize: 20 },
		});
		return result;
	},
	pendingComponent: ContactsListSkeleton,
	pendingMinMs: 200,
	component: ContactsPage,
});

function ContactsPage() {
	const router = useRouter();
	const data = Route.useLoaderData();
	const { search, page } = Route.useLoaderDeps();
	const [searchInput, setSearchInput] = useState(search);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const deleteContactFn = useServerFn(deleteContact);

	const handleSearch = (value: string) => {
		setSearchInput(value);
		router.navigate({
			to: "/app/contacts",
			search: { q: value || undefined, page: 1 },
		});
	};

	const handlePageChange = (newPage: number) => {
		router.navigate({
			to: "/app/contacts",
			search: { q: search || undefined, page: newPage },
		});
	};

	const handleDelete = async (id: string) => {
		if (confirm("Are you sure you want to delete this contact?")) {
			setIsDeleting(true);
			try {
				await deleteContactFn({ data: id });
				router.invalidate();
			} finally {
				setIsDeleting(false);
			}
		}
	};

	const handleCreateSuccess = () => {
		setIsCreateOpen(false);
		router.invalidate();
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
					<p className="text-muted-foreground">
						Manage your contacts for campaigns and messaging
					</p>
				</div>
				<Button onClick={() => setIsCreateOpen(true)}>
					<Plus className="mr-2 size-4" />
					Add Contact
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-4">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search by name, phone, or email..."
								value={searchInput}
								onChange={(e) => handleSearch(e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{data.contacts && data.contacts.length > 0 ? (
						<>
							<ContactsTable
								contacts={data.contacts}
								onDelete={handleDelete}
								isDeleting={isDeleting}
							/>
							{data.totalPages > 1 && (
								<div className="mt-4 flex items-center justify-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handlePageChange(Math.max(1, page - 1))}
										disabled={page === 1}
									>
										Previous
									</Button>
									<span className="text-sm text-muted-foreground">
										Page {page} of {data.totalPages}
									</span>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											handlePageChange(Math.min(data.totalPages, page + 1))
										}
										disabled={page === data.totalPages}
									>
										Next
									</Button>
								</div>
							)}
						</>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="rounded-full bg-muted p-4">
								<Users className="size-8 text-muted-foreground" />
							</div>
							<h3 className="mt-4 text-lg font-semibold">No contacts yet</h3>
							<p className="mt-2 max-w-sm text-sm text-muted-foreground">
								{search
									? "No contacts match your search. Try a different query."
									: "Get started by adding your first contact. Contacts are used for campaigns and conversations."}
							</p>
							{!search && (
								<Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
									<Plus className="mr-2 size-4" />
									Add Contact
								</Button>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			<CreateContactDialog
				open={isCreateOpen}
				onOpenChange={setIsCreateOpen}
				onSuccess={handleCreateSuccess}
			/>
		</div>
	);
}

function ContactsListSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-9 w-32" />
					<Skeleton className="h-5 w-64" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>

			{/* Card with table */}
			<Card>
				<CardHeader>
					<Skeleton className="h-10 w-full" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* Table header */}
						<div className="flex items-center gap-4 border-b pb-3">
							<Skeleton className="size-4" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-20" />
						</div>
						{/* Table rows */}
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="flex items-center gap-4 py-2">
								<Skeleton className="size-4" />
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-6 w-16 rounded-full" />
								<Skeleton className="h-4 w-24" />
								<Skeleton className="size-8 ml-auto" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
