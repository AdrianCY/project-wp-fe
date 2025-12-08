import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { getUserStatus } from "@/server/auth";

export const Route = createFileRoute("/app")({
	beforeLoad: async () => {
		// Server-side auth and status check using server function
		const status = await getUserStatus();

		if (!status.session) {
			throw redirect({
				to: "/sign-in",
			});
		}

		return {
			session: status.session,
			hasOrganization: status.hasOrganization,
			hasConnectedWABA: status.hasConnectedWABA,
			activeOrganization: status.activeOrganization,
		};
	},
	component: AppLayout,
});

function AppLayout() {
	const { activeOrganization } = Route.useRouteContext();

	return (
		<SidebarProvider>
			<AppSidebar activeOrganization={activeOrganization} />
			<SidebarInset>
				<header className="flex h-14 items-center gap-4 border-b px-4">
					<SidebarTrigger />
				</header>
				<main className="flex-1 p-6">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
