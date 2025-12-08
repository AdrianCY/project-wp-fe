import { valibotResolver } from "@hookform/resolvers/valibot";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailOtp, signIn } from "@/lib/auth-client";
import {
	type EmailStepFormData,
	emailStepSchema,
	type OtpStepFormData,
	otpStepSchema,
} from "@/lib/validations/auth";

type AuthStep = "email" | "otp";

interface AuthFormProps {
	mode: "sign-in" | "sign-up";
}

export function AuthForm({ mode }: AuthFormProps) {
	const [step, setStep] = useState<AuthStep>("email");
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const id = useId();

	const handleBack = () => {
		setStep("email");
		setError(null);
	};

	const handleEmailSubmit = async (data: EmailStepFormData) => {
		setError(null);
		setIsLoading(true);

    console.log("handleEmailSubmit", data);

		try {
			const result = await emailOtp.sendVerificationOtp({
				email: data.email,
				type: "sign-in",
			});

			if (result.error) {
				setError(result.error.message || "Failed to send verification code");
				return;
			}

			setEmail(data.email);
			setStep("otp");
		} catch {
			setError("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	const handleOtpSubmit = async (data: OtpStepFormData) => {
		setError(null);
		setIsLoading(true);

		try {
			const result = await signIn.emailOtp({
				email,
				otp: data.otp,
			});

			if (result.error) {
				if (result.error.code === "TOO_MANY_ATTEMPTS") {
					setError("Too many attempts. Please request a new code.");
				} else {
					setError(result.error.message || "Invalid verification code");
				}
				return;
			}

			window.location.href = "/app";
		} catch {
			setError("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	const handleResendOtp = async () => {
		setError(null);
		setIsLoading(true);

		try {
			const result = await emailOtp.sendVerificationOtp({
				email,
				type: "sign-in",
			});

			if (result.error) {
				setError(result.error.message || "Failed to resend code");
			}
		} catch {
			setError("Failed to resend code");
		} finally {
			setIsLoading(false);
		}
	};

	if (step === "otp") {
		return (
			<OtpStep
				id={id}
				email={email}
				error={error}
				isLoading={isLoading}
				onSubmit={handleOtpSubmit}
				onBack={handleBack}
				onResend={handleResendOtp}
				mode={mode}
			/>
		);
	}

	return (
		<EmailStep
			id={id}
			error={error}
			isLoading={isLoading}
			onSubmit={handleEmailSubmit}
			mode={mode}
		/>
	);
}

interface EmailStepProps {
	id: string;
	error: string | null;
	isLoading: boolean;
	onSubmit: (data: EmailStepFormData) => void;
	mode: "sign-in" | "sign-up";
}

function EmailStep({ id, error, isLoading, onSubmit, mode }: EmailStepProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<EmailStepFormData>({
		resolver: valibotResolver(emailStepSchema),
		defaultValues: { email: "" },
	});

	const isSignUp = mode === "sign-up";

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl font-bold">
					{isSignUp ? "Create an account" : "Welcome back"}
				</CardTitle>
				<CardDescription>
					Enter your email to receive a verification code
				</CardDescription>
			</CardHeader>
			<form onSubmit={handleSubmit(onSubmit)}>
				<CardContent className="space-y-4">
					{error && (
						<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor={`${id}-email`}>Email</Label>
						<Input
							id={`${id}-email`}
							type="email"
							placeholder="you@example.com"
							disabled={isLoading}
							autoComplete="email"
							autoFocus
							{...register("email")}
						/>
						{errors.email && (
							<p className="text-sm text-destructive">{errors.email.message}</p>
						)}
					</div>
				</CardContent>
				<CardFooter className="flex flex-col space-y-4 pt-2">
					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Sending code...
							</>
						) : (
							<>
								<Mail className="mr-2 size-4" />
								Continue with Email
							</>
						)}
					</Button>
					<p className="text-center text-sm text-muted-foreground">
						{isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
						<Link
							to={isSignUp ? "/sign-in" : "/sign-up"}
							className="text-primary hover:underline"
						>
							{isSignUp ? "Sign in" : "Sign up"}
						</Link>
					</p>
				</CardFooter>
			</form>
		</Card>
	);
}

interface OtpStepProps {
	id: string;
	email: string;
	error: string | null;
	isLoading: boolean;
	onSubmit: (data: OtpStepFormData) => void;
	onBack: () => void;
	onResend: () => void;
	mode: "sign-in" | "sign-up";
}

function OtpStep({
	id,
	email,
	error,
	isLoading,
	onSubmit,
	onBack,
	onResend,
	mode,
}: OtpStepProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<OtpStepFormData>({
		resolver: valibotResolver(otpStepSchema),
		defaultValues: { otp: "" },
	});

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="space-y-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="-ml-2 mb-2 w-fit"
					onClick={onBack}
					disabled={isLoading}
				>
					<ArrowLeft className="mr-1 size-4" />
					Back
				</Button>
				<CardTitle className="text-2xl font-bold">Check your email</CardTitle>
				<CardDescription>
					We sent a verification code to{" "}
					<span className="font-medium text-foreground">{email}</span>
				</CardDescription>
			</CardHeader>
			<form onSubmit={handleSubmit(onSubmit)}>
				<CardContent className="space-y-4">
					{error && (
						<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor={`${id}-otp`}>Verification Code</Label>
						<Input
							id={`${id}-otp`}
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							maxLength={6}
							placeholder="000000"
							disabled={isLoading}
							autoComplete="one-time-code"
							autoFocus
							className="text-center text-2xl tracking-[0.5em] font-mono"
							{...register("otp")}
						/>
						{errors.otp && (
							<p className="text-sm text-destructive">{errors.otp.message}</p>
						)}
					</div>
				</CardContent>
				<CardFooter className="flex flex-col space-y-4 pt-2">
					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Verifying...
							</>
						) : (
							<>Verify & {mode === "sign-up" ? "Create Account" : "Sign In"}</>
						)}
					</Button>
					<p className="text-center text-sm text-muted-foreground">
						Didn't receive a code?{" "}
						<button
							type="button"
							onClick={onResend}
							disabled={isLoading}
							className="text-primary hover:underline disabled:opacity-50"
						>
							Resend
						</button>
					</p>
				</CardFooter>
			</form>
		</Card>
	);
}
