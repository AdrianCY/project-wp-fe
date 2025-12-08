import { emailOTPClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_APP_URL || "http://localhost:3000",
	plugins: [organizationClient(), emailOTPClient()],
});

export const {
	signIn,
	signOut,
	useSession,
	organization,
	useActiveOrganization,
	useListOrganizations,
	emailOtp,
} = authClient;
