import { valibotResolver } from "@hookform/resolvers/valibot";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ContactActivityCard } from "@/components/contacts/contact-activity-card";
import { ContactInfoCard } from "@/components/contacts/contact-info-card";
import { ContactTagsCard } from "@/components/contacts/contact-tags-card";
import { CreateTagDialog } from "@/components/contacts/create-tag-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type CreateContactFormData,
	createContactSchema,
} from "@/lib/validations/contact";
import {
	contactQueryKey,
	contactQueryOptions,
	tagsQueryKey,
	tagsQueryOptions,
} from "@/queries/contacts";
import type { ContactTag } from "@/server/contacts";
import { createTag, deleteContact, updateContact } from "@/server/contacts";

export const Route = createFileRoute("/app/contacts/$contactId")({
	loader: async ({ params, context }) => {
		const [contact, tags] = await Promise.all([
			context.queryClient.ensureQueryData(
				contactQueryOptions(params.contactId),
			),
			context.queryClient.ensureQueryData(tagsQueryOptions()),
		]);
		return { contact, tags };
	},
	pendingComponent: ContactDetailSkeleton,
	pendingMs: 0, // Show skeleton immediately
	pendingMinMs: 300, // Show for at least 300ms to avoid flicker
	component: ContactDetailPage,
});

function ContactDetailPage() {
	const { contactId } = Route.useParams();
	const { queryClient } = Route.useRouteContext();
	const { data: contactData } = useSuspenseQuery(
		contactQueryOptions(contactId),
	);
	const { data: allTags } = useSuspenseQuery(tagsQueryOptions());
	const contact = contactData;
	const router = useRouter();
	const [isEditing, setIsEditing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isCreatingTag, setIsCreatingTag] = useState(false);

	const updateContactFn = useServerFn(updateContact);
	const deleteContactFn = useServerFn(deleteContact);
	const createTagFn = useServerFn(createTag);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isDirty },
	} = useForm<CreateContactFormData>({
		resolver: valibotResolver(createContactSchema),
		values: contact
			? {
					phoneNumber: contact.phoneNumber,
					name: contact.name || "",
					email: contact.email || "",
				}
			: undefined,
	});

	const handleDelete = async () => {
		if (
			confirm(
				"Are you sure you want to delete this contact? This action cannot be undone.",
			)
		) {
			setIsDeleting(true);
			try {
				await deleteContactFn({ data: contactId });
				await queryClient.invalidateQueries({
					queryKey: contactQueryKey(contactId),
				});
				router.navigate({ to: "/app/contacts" });
			} finally {
				setIsDeleting(false);
			}
		}
	};

	const onSubmit = async (data: CreateContactFormData) => {
		setIsUpdating(true);
		setError(null);
		try {
			await updateContactFn({
				data: {
					id: contactId,
					phoneNumber: data.phoneNumber,
					name: data.name || undefined,
					email: data.email || undefined,
					tagIds: contact?.tags.map((t) => t.id),
				},
			});
			// Invalidate this contact detail query to show updated data
			await queryClient.invalidateQueries({
				queryKey: contactQueryKey(contactId),
			});
			setIsEditing(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update contact");
		} finally {
			setIsUpdating(false);
		}
	};

	const handleAddTag = async (tag: ContactTag) => {
		if (!contact) return;
		const currentTagIds = contact.tags.map((t) => t.id);
		if (!currentTagIds.includes(tag.id)) {
			setIsUpdating(true);
			try {
				await updateContactFn({
					data: {
						id: contactId,
						phoneNumber: contact.phoneNumber,
						name: contact.name || undefined,
						email: contact.email || undefined,
						tagIds: [...currentTagIds, tag.id],
					},
				});
				// Invalidate this contact detail query to show updated data
				await queryClient.invalidateQueries({
					queryKey: contactQueryKey(contactId),
				});
			} finally {
				setIsUpdating(false);
			}
		}
	};

	const handleRemoveTag = async (tagId: string) => {
		if (!contact) return;
		const newTagIds = contact.tags
			.filter((t) => t.id !== tagId)
			.map((t) => t.id);
		setIsUpdating(true);
		try {
			await updateContactFn({
				data: {
					id: contactId,
					phoneNumber: contact.phoneNumber,
					name: contact.name || undefined,
					email: contact.email || undefined,
					tagIds: newTagIds,
				},
			});
			// Invalidate this contact detail query to show updated data
			await queryClient.invalidateQueries({
				queryKey: contactQueryKey(contactId),
			});
		} finally {
			setIsUpdating(false);
		}
	};

	const handleCreateTag = async (data: { name: string; color: string }) => {
		setIsCreatingTag(true);
		try {
			await createTagFn({ data });
			// Invalidate tags query to refetch with new tag
			await queryClient.invalidateQueries({
				queryKey: tagsQueryKey,
			});
			setIsCreateTagOpen(false);
		} finally {
			setIsCreatingTag(false);
		}
	};

	const availableTags =
		allTags?.filter((tag) => !contact?.tags.some((t) => t.id === tag.id)) || [];

	if (!contact) {
		return <ContactNotFound />;
	}

	return (
		<div className="space-y-6">
			<ContactDetailHeader
				name={contact.name}
				phoneNumber={contact.phoneNumber}
				isEditing={isEditing}
				isDirty={isDirty}
				isUpdating={isUpdating}
				isDeleting={isDeleting}
				onEdit={() => setIsEditing(true)}
				onCancel={() => {
					setIsEditing(false);
					reset();
				}}
				onSave={handleSubmit(onSubmit)}
				onDelete={handleDelete}
			/>

			{error && (
				<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			)}

			<div className="grid gap-6 md:grid-cols-2">
				<ContactInfoCard
					register={register}
					errors={errors}
					isEditing={isEditing}
					isPending={isUpdating}
				/>

				<ContactTagsCard
					tags={contact.tags}
					availableTags={availableTags}
					onAddTag={handleAddTag}
					onRemoveTag={handleRemoveTag}
					onOpenCreateTag={() => setIsCreateTagOpen(true)}
				/>

				<ContactActivityCard
					createdAt={contact.createdAt}
					updatedAt={contact.updatedAt}
				/>
			</div>

			<CreateTagDialog
				open={isCreateTagOpen}
				onOpenChange={setIsCreateTagOpen}
				onCreateTag={handleCreateTag}
				isPending={isCreatingTag}
			/>
		</div>
	);
}

function ContactDetailHeader({
	name,
	phoneNumber,
	isEditing,
	isDirty,
	isUpdating,
	isDeleting,
	onEdit,
	onCancel,
	onSave,
	onDelete,
}: {
	name: string | null;
	phoneNumber: string;
	isEditing: boolean;
	isDirty: boolean;
	isUpdating: boolean;
	isDeleting: boolean;
	onEdit: () => void;
	onCancel: () => void;
	onSave: () => void;
	onDelete: () => void;
}) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-4">
				<Link to="/app/contacts">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="size-4" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						{name || "Unnamed Contact"}
					</h1>
					<p className="font-mono text-muted-foreground">{phoneNumber}</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{isEditing ? (
					<>
						<Button variant="outline" onClick={onCancel}>
							Cancel
						</Button>
						<Button onClick={onSave} disabled={isUpdating || !isDirty}>
							<Save className="mr-2 size-4" />
							{isUpdating ? "Saving..." : "Save"}
						</Button>
					</>
				) : (
					<>
						<Button variant="outline" onClick={onEdit}>
							Edit
						</Button>
						<Button
							variant="destructive"
							onClick={onDelete}
							disabled={isDeleting}
						>
							<Trash2 className="mr-2 size-4" />
							{isDeleting ? "Deleting..." : "Delete"}
						</Button>
					</>
				)}
			</div>
		</div>
	);
}

function ContactNotFound() {
	return (
		<div className="space-y-6">
			<Link to="/app/contacts">
				<Button variant="ghost" size="sm">
					<ArrowLeft className="mr-2 size-4" />
					Back to Contacts
				</Button>
			</Link>
			<Card>
				<CardContent className="pt-6">
					<p className="text-center text-muted-foreground">
						Contact not found.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

function ContactDetailSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header skeleton */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Skeleton className="size-10 rounded-md" />
					<div className="space-y-2">
						<Skeleton className="h-7 w-48" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-9 w-16" />
					<Skeleton className="h-9 w-20" />
				</div>
			</div>

			{/* Cards skeleton */}
			<div className="grid gap-6 md:grid-cols-2">
				{/* Contact Info Card */}
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-4 w-56" />
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-10 w-full" />
						</div>
					</CardContent>
				</Card>

				{/* Tags Card */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<Skeleton className="h-6 w-16" />
								<Skeleton className="h-4 w-48" />
							</div>
							<Skeleton className="h-8 w-24" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							<Skeleton className="h-6 w-16 rounded-full" />
							<Skeleton className="h-6 w-20 rounded-full" />
							<Skeleton className="h-6 w-14 rounded-full" />
						</div>
					</CardContent>
				</Card>

				{/* Activity Card */}
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-20" />
						<Skeleton className="h-4 w-44" />
					</CardHeader>
					<CardContent className="space-y-2">
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-4 w-48" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
