import { valibotResolver } from "@hookform/resolvers/valibot";
import { useServerFn } from "@tanstack/react-start";
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
import {
	type CreateContactFormData,
	createContactSchema,
} from "@/lib/validations/contact";
import { createContact } from "@/server/contacts";

interface CreateContactDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function CreateContactDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateContactDialogProps) {
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	const createContactFn = useServerFn(createContact);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<CreateContactFormData>({
		resolver: valibotResolver(createContactSchema),
		defaultValues: { phoneNumber: "", name: "", email: "" },
	});

	const onSubmit = async (data: CreateContactFormData) => {
		setError(null);
		setIsPending(true);

		try {
			const result = await createContactFn({
				data: {
					phoneNumber: data.phoneNumber,
					name: data.name || undefined,
					email: data.email || undefined,
				},
			});

			if (!result) {
				setError("Failed to create contact");
				return;
			}

			reset();
			onOpenChange(false);
			onSuccess?.();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An unexpected error occurred",
			);
		} finally {
			setIsPending(false);
		}
	};

	const handleClose = (isOpen: boolean) => {
		if (!isOpen) {
			reset();
			setError(null);
		}
		onOpenChange(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent>
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle>Add Contact</DialogTitle>
						<DialogDescription>
							Add a new contact to your database. The phone number is required
							for WhatsApp messaging.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						{error && (
							<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
								{error}
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="phoneNumber">
								Phone Number <span className="text-destructive">*</span>
							</Label>
							<Input
								id="phoneNumber"
								placeholder="+1234567890"
								disabled={isPending}
								{...register("phoneNumber")}
							/>
							<p className="text-xs text-muted-foreground">
								Include country code (e.g., +1 for US, +44 for UK)
							</p>
							{errors.phoneNumber && (
								<p className="text-sm text-destructive">
									{errors.phoneNumber.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								placeholder="John Doe"
								disabled={isPending}
								{...register("name")}
							/>
							{errors.name && (
								<p className="text-sm text-destructive">
									{errors.name.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="john@example.com"
								disabled={isPending}
								{...register("email")}
							/>
							{errors.email && (
								<p className="text-sm text-destructive">
									{errors.email.message}
								</p>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleClose(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Creating..." : "Add Contact"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
