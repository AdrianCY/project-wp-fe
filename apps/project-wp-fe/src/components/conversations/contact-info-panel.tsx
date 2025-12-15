import { format } from "date-fns";
import { Mail, Phone, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Contact {
	id: string;
	name: string | null;
	phoneNumber: string;
	email: string | null;
}

interface Conversation {
	id: string;
	createdAt: Date;
	windowExpiresAt: Date | null;
	isOpen: boolean;
}

interface ContactInfoPanelProps {
	contact: Contact;
	conversation: Conversation;
	onClose: () => void;
}

export function ContactInfoPanel({
	contact,
	conversation,
	onClose,
}: ContactInfoPanelProps) {
	const isWindowActive =
		conversation.windowExpiresAt &&
		new Date(conversation.windowExpiresAt) > new Date();

	return (
		<div className="flex h-full w-80 flex-col border-l bg-background">
			{/* Header */}
			<div className="flex items-center justify-between border-b px-4 py-3">
				<span className="font-medium">Contact Info</span>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X className="size-4" />
				</Button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto">
				{/* Avatar & Name */}
				<div className="flex flex-col items-center gap-3 p-6">
					<div className="flex size-20 items-center justify-center rounded-full bg-muted">
						<User className="size-10 text-muted-foreground" />
					</div>
					<div className="text-center">
						<h3 className="text-lg font-semibold">
							{contact.name || "Unknown"}
						</h3>
						<p className="text-sm text-muted-foreground">
							{contact.phoneNumber}
						</p>
					</div>
				</div>

				<Separator />

				{/* Contact Details */}
				<div className="space-y-4 p-4">
					<h4 className="text-sm font-medium text-muted-foreground">
						Contact Details
					</h4>

					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<div className="flex size-9 items-center justify-center rounded-full bg-muted">
								<Phone className="size-4 text-muted-foreground" />
							</div>
							<div className="flex flex-col">
								<span className="text-sm font-medium">Phone</span>
								<span className="text-sm text-muted-foreground">
									{contact.phoneNumber}
								</span>
							</div>
						</div>

						{contact.email && (
							<div className="flex items-center gap-3">
								<div className="flex size-9 items-center justify-center rounded-full bg-muted">
									<Mail className="size-4 text-muted-foreground" />
								</div>
								<div className="flex flex-col">
									<span className="text-sm font-medium">Email</span>
									<span className="text-sm text-muted-foreground">
										{contact.email}
									</span>
								</div>
							</div>
						)}
					</div>
				</div>

				<Separator />

				{/* Conversation Details */}
				<div className="space-y-4 p-4">
					<h4 className="text-sm font-medium text-muted-foreground">
						Conversation
					</h4>

					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Started</span>
							<span>
								{format(new Date(conversation.createdAt), "MMM d, yyyy")}
							</span>
						</div>

						<div className="flex justify-between">
							<span className="text-muted-foreground">Status</span>
							<span
								className={
									conversation.isOpen ? "text-green-600" : "text-muted-foreground"
								}
							>
								{conversation.isOpen ? "Open" : "Closed"}
							</span>
						</div>

						<div className="flex justify-between">
							<span className="text-muted-foreground">Message Window</span>
							<span
								className={
									isWindowActive ? "text-green-600" : "text-orange-600"
								}
							>
								{isWindowActive ? "Active" : "Expired"}
							</span>
						</div>

						{isWindowActive && conversation.windowExpiresAt && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">Window Expires</span>
								<span className="text-xs">
									{format(
										new Date(conversation.windowExpiresAt),
										"MMM d, HH:mm",
									)}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

