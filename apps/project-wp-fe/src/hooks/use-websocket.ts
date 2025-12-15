import { useCallback, useEffect, useRef, useState } from "react";

export type WebSocketMessage = {
	type: string;
	[key: string]: unknown;
};

export type WebSocketStatus =
	| "connecting"
	| "connected"
	| "disconnected"
	| "error";

export type UseWebSocketOptions = {
	wsSecretKey: string | null;
	onMessage?: (message: WebSocketMessage) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onError?: (error: Event) => void;
	autoConnect?: boolean;
	reconnectInterval?: number;
	maxReconnectAttempts?: number;
};

export function useWebSocket(options: UseWebSocketOptions) {
	const {
		wsSecretKey,
		onMessage,
		onConnect,
		onDisconnect,
		onError,
		autoConnect = true,
		reconnectInterval = 3000,
		maxReconnectAttempts = 5,
	} = options;

	const [status, setStatus] = useState<WebSocketStatus>("disconnected");
	const [organizationId, setOrganizationId] = useState<string | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const shouldReconnectRef = useRef(true);

	const connect = useCallback(() => {
		if (
			wsRef.current?.readyState === WebSocket.OPEN ||
			wsRef.current?.readyState === WebSocket.CONNECTING
		) {
			return;
		}

		if (!wsSecretKey) {
			console.error("[WS] No WebSocket secret key available");
			setStatus("error");
			return;
		}

		setStatus("connecting");

		try {
			// Get WebSocket URL from environment or default
			const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
			const url = `${wsUrl}?key=${encodeURIComponent(wsSecretKey)}`;

			const ws = new WebSocket(url);
			wsRef.current = ws;

			ws.onopen = () => {
				console.log("[WS] Connected");
				setStatus("connected");
				reconnectAttemptsRef.current = 0;
				onConnect?.();
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data) as WebSocketMessage;

					// Handle connection confirmation
					if (data.type === "connected" && data.organizationId) {
						setOrganizationId(data.organizationId as string);
					}

					onMessage?.(data);
				} catch (error) {
					console.error("[WS] Failed to parse message:", error);
				}
			};

			ws.onerror = (event) => {
				console.error("[WS] Error:", event);
				setStatus("error");
				onError?.(event);
			};

			ws.onclose = () => {
				console.log("[WS] Disconnected");
				setStatus("disconnected");
				wsRef.current = null;
				onDisconnect?.();

				// Attempt to reconnect if we should
				if (
					shouldReconnectRef.current &&
					reconnectAttemptsRef.current < maxReconnectAttempts
				) {
					reconnectAttemptsRef.current += 1;
					console.log(
						`[WS] Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
					);
					reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
				}
			};
		} catch (error) {
			console.error("[WS] Failed to connect:", error);
			setStatus("error");
		}
	}, [
		wsSecretKey,
		onConnect,
		onDisconnect,
		onError,
		onMessage,
		maxReconnectAttempts,
		reconnectInterval,
	]);

	const disconnect = useCallback(() => {
		shouldReconnectRef.current = false;

		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}

		setStatus("disconnected");
		setOrganizationId(null);
	}, []);

	const send = useCallback((message: WebSocketMessage) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message));
		} else {
			console.warn("[WS] Cannot send message: not connected");
		}
	}, []);

	// Auto-connect on mount when wsSecretKey is available
	useEffect(() => {
		if (autoConnect && wsSecretKey) {
			shouldReconnectRef.current = true;
			connect();
		}

		return () => {
			shouldReconnectRef.current = false;
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, [autoConnect, wsSecretKey, connect]);

	return {
		status,
		organizationId,
		connect,
		disconnect,
		send,
		isConnected: status === "connected",
	};
}
