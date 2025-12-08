import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth, type Session } from "@/lib/auth";

/**
 * Auth middleware for protected server functions.
 * Validates the session and attaches it to the context.
 * Throws an error if the user is not authenticated.
 */
export const authMiddleware = createMiddleware().server(async ({ next }) => {
	const request = getRequest();
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session) {
		throw new Error("Unauthorized");
	}

	return next({
		context: {
			session,
		},
	});
});

/**
 * Type helper for server function handlers that use authMiddleware.
 * Provides typed access to the session in the context.
 */
export type AuthContext = {
	session: Session;
};
