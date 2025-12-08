import { useId } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateContactFormData } from "@/lib/validations/contact";

interface ContactInfoCardProps {
	register: UseFormRegister<CreateContactFormData>;
	errors: FieldErrors<CreateContactFormData>;
	isEditing: boolean;
	isPending: boolean;
}

export function ContactInfoCard({
	register,
	errors,
	isEditing,
	isPending,
}: ContactInfoCardProps) {
	const phoneNumberId = useId();
	const nameId = useId();
	const emailId = useId();

	return (
		<Card>
			<CardHeader>
				<CardTitle>Contact Information</CardTitle>
				<CardDescription>Basic contact details for messaging</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor={phoneNumberId}>
							Phone Number <span className="text-destructive">*</span>
						</Label>
						<Input
							id={phoneNumberId}
							disabled={!isEditing || isPending}
							{...register("phoneNumber")}
						/>
						{errors.phoneNumber && (
							<p className="text-sm text-destructive">
								{errors.phoneNumber.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor={nameId}>Name</Label>
						<Input
							id={nameId}
							disabled={!isEditing || isPending}
							{...register("name")}
						/>
						{errors.name && (
							<p className="text-sm text-destructive">{errors.name.message}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor={emailId}>Email</Label>
						<Input
							id={emailId}
							type="email"
							disabled={!isEditing || isPending}
							{...register("email")}
						/>
						{errors.email && (
							<p className="text-sm text-destructive">{errors.email.message}</p>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
