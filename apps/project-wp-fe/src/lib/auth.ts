import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, organization } from "better-auth/plugins";
import { Resend } from "resend";

import { db } from "@/db";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
	}),

	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5, // 5 minutes
		},
	},

	plugins: [
		organization({
			allowUserToCreateOrganization: true,
			organizationLimit: 5,
			creatorRole: "owner",
			membershipLimit: 100,
		}),
		emailOTP({
			otpLength: 6,
			expiresIn: 300, // 5 minutes
			async sendVerificationOTP({ email, otp, type }) {
				const subject =
					type === "sign-in"
						? "Your login code"
						: type === "email-verification"
							? "Verify your email"
							: "Reset your password";

				const { error } = await resend.emails.send({
					from: process.env.EMAIL_FROM || "Acme <onboarding@resend.dev>",
					to: email,
					subject,
					html: `
						<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
							<h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #111;">
								${subject}
							</h1>
							<p style="font-size: 16px; color: #444; margin-bottom: 24px;">
								Enter this code to ${type === "sign-in" ? "sign in to" : type === "email-verification" ? "verify your email for" : "reset your password on"} your account:
							</p>
							<div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
								<span style="font-size: 32px; font-weight: 700; letter-spacing: 0.3em; font-family: monospace; color: #111;">
									${otp}
								</span>
							</div>
							<p style="font-size: 14px; color: #666;">
								This code expires in 5 minutes. If you didn't request this code, you can safely ignore this email.
							</p>
						</div>
					`,
				});

				if (error) {
					console.error("Failed to send OTP email:", error);
					throw new Error("Failed to send verification email");
				}
			},
		}),
	],
});

export type Session = typeof auth.$Infer.Session;
