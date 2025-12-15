const websocketUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

let ws: WebSocket | null = null;

interface ConnectOptions {
	onOpen: (event: WebSocketEventMap["open"]) => void;
	onMessage: (event: WebSocketEventMap["message"]) => void;
	onError: (event: WebSocketEventMap["error"]) => void;
	onClose: (event: WebSocketEventMap["close"]) => void;
}

export function connect(options: ConnectOptions) {
	if (ws) {
		console.log("WebSocket already connected");
		return;
	}

	ws = new WebSocket(websocketUrl);

	ws.onopen = (ev) => options.onOpen(ev);
	ws.onmessage = (event) => options.onMessage(event);
	ws.onerror = (event) => options.onError(event);
	ws.onclose = (event) => options.onClose(event);
}
