import { ArrowRight, Building2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { organization, useListOrganizations } from "@/lib/auth-client";
import { CreateOrganizationDialog } from "./create-organization-dialog";
import { PendingInvitationsDialog } from "./pending-invitations";

const DISMISSED_KEY = "org-onboarding-dismissed";

interface OrganizationOnboardingProps {
	onComplete?: () => void;
}

interface Invitation {
	id: string;
	organizationId: string;
	organizationName: string;
	organizationSlug: string;
	role: string;
	status: string;
	expiresAt: Date;
	inviterEmail: string;
}

export function OrganizationOnboarding({
	onComplete,
}: OrganizationOnboardingProps) {
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [showInvitationsDialog, setShowInvitationsDialog] = useState(false);
	const [isDismissed, setIsDismissed] = useState(false);
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);

	const { refetch: refetchOrganizations } = useListOrganizations();

	useEffect(() => {
		const dismissed = localStorage.getItem(DISMISSED_KEY);
		if (dismissed === "true") {
			setIsDismissed(true);
		}
	}, []);

	useEffect(() => {
		const fetchInvitations = async () => {
			try {
				const result = await organization.listInvitations();
				if (result.data) {
					setInvitations(result.data as Invitation[]);
				}
			} catch {
				// Silently fail - invitations are optional
			} finally {
				setIsLoadingInvitations(false);
			}
		};

		fetchInvitations();
	}, []);

	const handleDismiss = () => {
		localStorage.setItem(DISMISSED_KEY, "true");
		setIsDismissed(true);
	};

	const handleSuccess = () => {
		localStorage.removeItem(DISMISSED_KEY);
		refetchOrganizations();
		onComplete?.();
	};

	const pendingInvitations = invitations.filter(
		(inv) => inv.status === "pending",
	);

	if (isDismissed) {
		return null;
	}

	return (
		<>
			<Empty className="border border-dashed bg-gradient-to-b from-muted/30 to-background">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Building2 />
					</EmptyMedia>
					<EmptyTitle>Welcome! Let's get you set up</EmptyTitle>
					<EmptyDescription>
						Create or join an organization to start managing your WhatsApp
						Business accounts, contacts, and campaigns.
					</EmptyDescription>
				</EmptyHeader>

				<EmptyContent>
					<div className="flex flex-col sm:flex-row gap-3">
						<Button onClick={() => setShowCreateDialog(true)}>
							<Building2 className="mr-2 size-4" />
							Create Organization
						</Button>
						{!isLoadingInvitations && pendingInvitations.length > 0 && (
							<Button
								variant="outline"
								onClick={() => setShowInvitationsDialog(true)}
							>
								<Mail className="mr-2 size-4" />
								View Invitations
								<span className="ml-2 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
									{pendingInvitations.length}
								</span>
							</Button>
						)}
					</div>
					<Button
						variant="link"
						className="text-muted-foreground"
						size="sm"
						onClick={handleDismiss}
					>
						Skip for now
						<ArrowRight className="ml-1 size-3" />
					</Button>
				</EmptyContent>
			</Empty>

			<CreateOrganizationDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				onSuccess={handleSuccess}
			/>

			<PendingInvitationsDialog
				open={showInvitationsDialog}
				onOpenChange={setShowInvitationsDialog}
				invitations={invitations}
				onSuccess={handleSuccess}
			/>
		</>
	);
}
