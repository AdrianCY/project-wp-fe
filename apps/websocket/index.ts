import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import * as schema from "wp-db";

config();

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

const PORT = Number(process.env.WS_PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });

// Store authenticated connections with their organization ID
interface AuthenticatedClient {
	ws: WebSocket;
	organizationId: string;
	userId: string;
	sessionId: string;
}

const clients = new Map<WebSocket, AuthenticatedClient>();

// Validate wsSecretKey and return session data
async function validateConnection(
	wsSecretKey: string,
): Promise<{ sessionId: string; userId: string; organizationId: string } | null> {
	const sessionRecord = await db.query.session.findFirst({
		where: eq(schema.session.wsSecretKey, wsSecretKey),
	});

	if (!sessionRecord) {
		return null;
	}

	// Check if session is expired
	if (new Date(sessionRecord.expiresAt) < new Date()) {
		return null;
	}

	// Session must have an active organization
	if (!sessionRecord.activeOrganizationId) {
		return null;
	}

	return {
		sessionId: sessionRecord.id,
		userId: sessionRecord.userId,
		organizationId: sessionRecord.activeOrganizationId,
	};
}

wss.on("connection", async function connection(ws, req) {
	const url = new URL(req.url || "", `ws://localhost:${PORT}`);
	const wsSecretKey = url.searchParams.get("key");

	if (!wsSecretKey) {
		ws.close(4001, "Missing authentication key");
		return;
	}

	const sessionData = await validateConnection(wsSecretKey);

	if (!sessionData) {
		ws.close(4002, "Invalid or expired authentication key");
		return;
	}

	// Store authenticated client
	clients.set(ws, {
		ws,
		organizationId: sessionData.organizationId,
		userId: sessionData.userId,
		sessionId: sessionData.sessionId,
	});

	console.log(
		`[WS] Client connected: user=${sessionData.userId}, org=${sessionData.organizationId}`,
	);

	// Send connection success message
	ws.send(
		JSON.stringify({
			type: "connected",
			organizationId: sessionData.organizationId,
		}),
	);

	ws.on("error", console.error);

	ws.on("message", function message(data) {
		console.log("[WS] received: %s", data);
	});

	ws.on("close", () => {
		clients.delete(ws);
		console.log(`[WS] Client disconnected: user=${sessionData.userId}`);
	});
});

// Function to broadcast message to all clients in an organization
export function broadcastToOrganization(
	organizationId: string,
	message: object,
) {
	const messageStr = JSON.stringify(message);
	for (const [, client] of clients) {
		if (client.organizationId === organizationId) {
			client.ws.send(messageStr);
		}
	}
}

console.log(`[WS] WebSocket server running on port ${PORT}`);
