import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/sign-up")({
	component: SignUpPage,
});

function SignUpPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
			<AuthForm mode="sign-up" />
		</div>
	);
}
