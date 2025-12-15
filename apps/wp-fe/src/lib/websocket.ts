const websocketUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

let ws: WebSocket | null = null;

interface ConnectOptions {
	onOpen?: (event: WebSocketEventMap["open"]) => void;
	onMessage?: (event: WebSocketEventMap["message"]) => void;
	onError?: (event: WebSocketEventMap["error"]) => void;
	onClose?: (event: WebSocketEventMap["close"]) => void;
}

function connect(wsSecretKey: string, options?: ConnectOptions) {
	if (ws) {
		console.log("[WS] Already connected");
		return;
	}

	const url = `${websocketUrl}?key=${encodeURIComponent(wsSecretKey)}`;
	ws = new WebSocket(url);

	ws.onopen = (ev) => {
		console.log("[WS] Connected");
		options?.onOpen?.(ev);
	};

	ws.onmessage = (event) => {
		console.log("[WS] Message received");
		options?.onMessage?.(event);
	};

	ws.onerror = (event) => {
		console.error("[WS] Error", event);
		options?.onError?.(event);
	};

	ws.onclose = (event) => {
		console.log("[WS] Closed", event);
		options?.onClose?.(event);
	};
}

export const websocket = {
	connect,
};
