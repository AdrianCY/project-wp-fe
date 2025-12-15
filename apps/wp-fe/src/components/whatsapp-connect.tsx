import { useServerFn } from "@tanstack/react-start";
import {
	CheckCircle2,
	ExternalLink,
	Loader2,
	MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	launchWhatsAppSignup,
	type WhatsAppSignupResult,
} from "@/lib/facebook-sdk";
import { connectWhatsApp } from "@/server/whatsapp/connect";

interface WhatsAppConnectProps {
	organizationId: string;
	onSuccess?: () => void;
}

type ConnectionState =
	| "idle"
	| "connecting"
	| "processing"
	| "success"
	| "error";

export function WhatsAppConnect({
	organizationId,
	onSuccess,
}: WhatsAppConnectProps) {
	const [state, setState] = useState<ConnectionState>("idle");
	const [error, setError] = useState<string | null>(null);
	const connectWhatsAppFn = useServerFn(connectWhatsApp);

	const handleConnect = async () => {
		if (!organizationId) {
			setError("Please create or join an organization first");
			return;
		}

		setState("connecting");
		setError(null);

		launchWhatsAppSignup({
			onSuccess: async (result: WhatsAppSignupResult) => {
				setState("processing");

				try {
					await connectWhatsAppFn({
						data: {
							code: result.code,
							organizationId,
						},
					});

					setState("success");
					onSuccess?.();
				} catch (err) {
					setState("error");
					setError(
						err instanceof Error
							? err.message
							: "Failed to connect WhatsApp account",
					);
				}
			},
			onError: (err) => {
				setState("error");
				setError(err.message);
			},
			onCancel: () => {
				setState("idle");
			},
		});
	};

	if (state === "success") {
		return (
			<Empty className="border border-dashed bg-linear-to-b from-green-50/50 to-background dark:from-green-950/20 h-full">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<CheckCircle2 className="text-green-600" />
					</EmptyMedia>
					<EmptyTitle>WhatsApp Connected!</EmptyTitle>
					<EmptyDescription>
						Your WhatsApp Business account has been successfully connected. You
						can now send and receive messages.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button onClick={onSuccess}>Go to Dashboard</Button>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<Empty className="border border-dashed bg-linear-to-b from-muted/30 to-background h-full">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<MessageSquare />
				</EmptyMedia>
				<EmptyTitle>Connect WhatsApp Business</EmptyTitle>
				<EmptyDescription>
					Connect your WhatsApp Business account to start sending and receiving
					messages, create campaigns, and manage customer conversations.
				</EmptyDescription>
			</EmptyHeader>

			<EmptyContent>
				{error && (
					<div className="w-full rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
						{error}
					</div>
				)}

				<Button
					onClick={handleConnect}
					disabled={state === "connecting" || state === "processing"}
					size="lg"
				>
					{state === "connecting" || state === "processing" ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							{state === "connecting" ? "Connecting..." : "Setting up..."}
						</>
					) : (
						<>
							<MessageSquare className="mr-2 size-4" />
							Connect WhatsApp Account
						</>
					)}
				</Button>

				<Button
					variant="link"
					className="text-muted-foreground"
					size="sm"
					asChild
				>
					<a
						href="https://business.facebook.com/settings/whatsapp-business-accounts"
						target="_blank"
						rel="noopener noreferrer"
					>
						Manage existing accounts
						<ExternalLink className="ml-1 size-3" />
					</a>
				</Button>
			</EmptyContent>
		</Empty>
	);
}
