import { valibotResolver } from "@hookform/resolvers/valibot";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { organization } from "@/lib/auth-client";
import {
	type CreateOrganizationFormData,
	createOrganizationSchema,
} from "@/lib/validations/organization";

interface CreateOrganizationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 50);
}

export function CreateOrganizationDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateOrganizationDialogProps) {
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = useForm<CreateOrganizationFormData>({
		resolver: valibotResolver(createOrganizationSchema),
		defaultValues: { name: "", slug: "" },
	});

	const nameValue = watch("name");

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const name = e.target.value;
		setValue("name", name);
		setValue("slug", generateSlug(name));
	};

	const onSubmit = async (data: CreateOrganizationFormData) => {
		setError(null);
		setIsLoading(true);

		try {
			const result = await organization.create({
				name: data.name,
				slug: data.slug,
			});

			if (result.error) {
				setError(result.error.message || "Failed to create organization");
				return;
			}

			// Set as active organization
			if (result.data?.id) {
				await organization.setActive({ organizationId: result.data.id });
			}

			reset();
			onOpenChange(false);
			onSuccess?.();
		} catch {
			setError("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle>Create Organization</DialogTitle>
						<DialogDescription>
							Create a new organization to manage your WhatsApp Business
							accounts and team members.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						{error && (
							<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
								{error}
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="org-name">Organization Name</Label>
							<Input
								id="org-name"
								placeholder="Acme Inc."
								disabled={isLoading}
								{...register("name")}
								onChange={handleNameChange}
							/>
							{errors.name && (
								<p className="text-sm text-destructive">
									{errors.name.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="org-slug">Slug</Label>
							<Input
								id="org-slug"
								placeholder="acme-inc"
								disabled={isLoading}
								{...register("slug")}
							/>
							<p className="text-xs text-muted-foreground">
								This will be used in URLs: yourdomain.com/org/
								{watch("slug") || "your-slug"}
							</p>
							{errors.slug && (
								<p className="text-sm text-destructive">
									{errors.slug.message}
								</p>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Creating..." : "Create Organization"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
