// ============================================================================
// WEBHOOK PAYLOAD TYPES
// ============================================================================

export interface WebhookPayload {
	object: string;
	entry: WebhookEntry[];
}

export interface WebhookEntry {
	id: string; // WABA ID
	changes: WebhookChange[];
}

export interface WebhookChange {
	field: string;
	value: unknown;
}

// ============================================================================
// MESSAGE WEBHOOK TYPES
// ============================================================================

export interface MessageChangeValue {
	messaging_product: string;
	metadata: {
		display_phone_number: string;
		phone_number_id: string;
	};
	contacts?: Array<{
		profile: { name: string };
		wa_id: string;
	}>;
	messages?: Array<WebhookMessage>;
	statuses?: Array<WebhookStatus>;
}

export interface WebhookMessage {
	from: string;
	id: string;
	timestamp: string;
	type: string;
	text?: { body: string };
	image?: { id: string; mime_type: string; sha256: string; caption?: string };
	video?: { id: string; mime_type: string; sha256: string; caption?: string };
	audio?: { id: string; mime_type: string };
	document?: { id: string; filename: string; mime_type: string };
	location?: {
		latitude: number;
		longitude: number;
		name?: string;
		address?: string;
	};
	contacts?: Array<{
		name: { formatted_name: string };
		phones: Array<{ phone: string }>;
	}>;
	interactive?: { type: string; [key: string]: unknown };
	button?: { text: string; payload: string };
	reaction?: { message_id: string; emoji: string };
}

export interface WebhookStatus {
	id: string;
	status: "sent" | "delivered" | "read" | "failed";
	timestamp: string;
	recipient_id: string;
	errors?: Array<{ code: number; title: string }>;
}

// ============================================================================
// ACCOUNT WEBHOOK TYPES (Embedded Signup, etc.)
// ============================================================================

export interface AccountUpdateValue {
	event: string;
	waba_info?: {
		waba_id: string;
		owner_business_id: string;
	};
	phone_info?: {
		display_phone_number: string;
		phone_number_id: string;
		certificate?: string;
		new_name_status?: string;
		new_certificate_status?: string;
	};
	ban_info?: {
		waba_ban_state: string;
		waba_ban_date?: string;
	};
}

export interface AccountReviewUpdateValue {
	decision: string;
	rejection_reason?: string;
}

export interface PhoneNumberNameUpdateValue {
	display_phone_number: string;
	decision: string;
	requested_verified_name: string;
	rejection_reason?: string;
}

export interface PhoneNumberQualityUpdateValue {
	display_phone_number: string;
	current_limit: string;
	event: string;
}
