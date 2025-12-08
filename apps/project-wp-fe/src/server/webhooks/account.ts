import type {
	AccountReviewUpdateValue,
	AccountUpdateValue,
	PhoneNumberNameUpdateValue,
	PhoneNumberQualityUpdateValue,
} from "./types";

/**
 * Handle account_update events (Embedded Signup completion, ban status, etc.)
 */
export async function handleAccountUpdate(
	wabaId: string,
	value: AccountUpdateValue,
) {
	const { event, waba_info, phone_info, ban_info } = value;

	console.log(`[Webhook:Account] ${event} for WABA ${wabaId}`);

	// Handle different event types
	if (waba_info) {
		// WABA was shared/updated - this happens after embedded signup
		console.log(`[Webhook:Account] WABA shared: ${waba_info.waba_id}`);
		// TODO: Could trigger a refresh of WABA data from Graph API
	}

	if (phone_info) {
		// Phone number was registered/updated
		console.log(
			`[Webhook:Account] Phone updated: ${phone_info.display_phone_number}`,
		);
		// TODO: Could update phone number status in database
	}

	if (ban_info) {
		// Account ban status changed
		console.log(`[Webhook:Account] Ban status: ${ban_info.waba_ban_state}`);
		// TODO: Update WABA status in database if banned
	}
}

/**
 * Handle account_review_update events (Business verification decisions)
 */
export async function handleAccountReviewUpdate(
	wabaId: string,
	value: AccountReviewUpdateValue,
) {
	const { decision, rejection_reason } = value;

	console.log(`[Webhook:Account] Review decision for ${wabaId}: ${decision}`);

	if (rejection_reason) {
		console.log(`[Webhook:Account] Rejection reason: ${rejection_reason}`);
	}

	// TODO: Update organization/WABA verification status in database
}

/**
 * Handle phone_number_name_update events (Display name approval/rejection)
 */
export async function handlePhoneNumberNameUpdate(
	_wabaId: string,
	value: PhoneNumberNameUpdateValue,
) {
	const { display_phone_number, decision, requested_verified_name } = value;

	console.log(
		`[Webhook:Phone] Name update for ${display_phone_number}: ${decision}`,
	);

	if (decision === "APPROVED") {
		// TODO: Update phone number display name in database
		console.log(`[Webhook:Phone] Approved name: ${requested_verified_name}`);
	}
}

/**
 * Handle phone_number_quality_update events (Quality rating changes)
 */
export async function handlePhoneNumberQualityUpdate(
	_wabaId: string,
	value: PhoneNumberQualityUpdateValue,
) {
	const { display_phone_number, event, current_limit } = value;

	console.log(
		`[Webhook:Phone] Quality update for ${display_phone_number}: ${event}, limit: ${current_limit}`,
	);

	// TODO: Update phone number quality rating in database
}
