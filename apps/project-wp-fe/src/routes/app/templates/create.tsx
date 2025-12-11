import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TemplateCreateSkeleton } from "@/components/templates/template-create-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateComponent } from "@/server/templates";
import { createTemplate, getConnectedWABAs } from "@/server/templates";

export const Route = createFileRoute("/app/templates/create")({
	loader: async () => {
		const wabas = await getConnectedWABAs();
		return { wabas };
	},
	pendingComponent: TemplateCreateSkeleton,
	component: CreateTemplatePage,
});

type ButtonComponent = {
	type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY";
	text: string;
	phone_number?: string;
	url?: string;
};

function CreateTemplatePage() {
	const router = useRouter();
	const data = Route.useLoaderData();
	const wabas = data?.wabas || [];
	const createTemplateFn = useServerFn(createTemplate);

	const [wabaId, setWabaId] = useState("");
	const [name, setName] = useState("");
	const [language, setLanguage] = useState("en_US");
	const [category, setCategory] = useState<
		"utility" | "marketing" | "authentication"
	>("utility");
	const [headerText, setHeaderText] = useState("");
	const [bodyText, setBodyText] = useState("");
	const [footerText, setFooterText] = useState("");
	const [headerExample, setHeaderExample] = useState("");
	const [bodyExamples, setBodyExamples] = useState<string[]>([]);
	const [buttons, setButtons] = useState<ButtonComponent[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	// Extract variable count from text
	const getVariableCount = (text: string): number => {
		const matches = text.match(/\{\{(\d+)\}\}/g);
		if (!matches) return 0;
		const numbers = matches.map((m) =>
			Number.parseInt(m.match(/\d+/)?.[0] || "0"),
		);
		return Math.max(...numbers, 0);
	};

	const headerVariableCount = getVariableCount(headerText);
	const bodyVariableCount = getVariableCount(bodyText);

	const handleAddButton = () => {
		if (buttons.length < 3) {
			setButtons([...buttons, { type: "QUICK_REPLY", text: "" }]);
		}
	};

	const handleRemoveButton = (index: number) => {
		setButtons(buttons.filter((_, i) => i !== index));
	};

	const handleButtonChange = (
		index: number,
		field: keyof ButtonComponent,
		value: string,
	) => {
		const newButtons = [...buttons];
		newButtons[index] = { ...newButtons[index], [field]: value };
		setButtons(newButtons);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!wabaId) {
			setError("Please select a WhatsApp Business Account");
			return;
		}

		if (!name) {
			setError("Template name is required");
			return;
		}

		if (!/^[a-z0-9_]+$/.test(name)) {
			setError(
				"Template name must be lowercase with underscores only (e.g., my_template_01)",
			);
			return;
		}

		if (!bodyText) {
			setError("Body text is required");
			return;
		}

		setIsPending(true);

		// Validate examples for variables
		if (headerVariableCount > 0 && !headerExample.trim()) {
			setError("Please provide an example for the header variable");
			return;
		}

		if (bodyVariableCount > 0) {
			const filledExamples = bodyExamples.filter((ex) => ex.trim() !== "");
			if (filledExamples.length < bodyVariableCount) {
				setError(
					`Please provide examples for all ${bodyVariableCount} body variables`,
				);
				return;
			}
		}

		try {
			const components: TemplateComponent[] = [];

			// Add header if provided
			if (headerText) {
				const headerComponent: TemplateComponent = {
					type: "HEADER",
					format: "TEXT",
					text: headerText,
				};

				// Add example if header has variables
				if (headerVariableCount > 0) {
					headerComponent.example = {
						header_text: [headerExample],
					};
				}

				components.push(headerComponent);
			}

			// Add body (required)
			const bodyComponent: TemplateComponent = {
				type: "BODY",
				text: bodyText,
			};

			// Add examples if body has variables
			if (bodyVariableCount > 0) {
				bodyComponent.example = {
					body_text: [bodyExamples.slice(0, bodyVariableCount)],
				};
			}

			components.push(bodyComponent);

			// Add footer if provided
			if (footerText) {
				components.push({
					type: "FOOTER",
					text: footerText,
				});
			}

			// Add buttons if provided
			if (buttons.length > 0) {
				const validButtons = buttons.filter((btn) => btn.text.trim() !== "");
				if (validButtons.length > 0) {
					components.push({
						type: "BUTTONS",
						buttons: validButtons,
					});
				}
			}

			const result = await createTemplateFn({
				data: {
					wabaId,
					name,
					language,
					category,
					components,
				},
			});

			if (result.success) {
				toast.success(result.message);
				router.navigate({ to: "/app/templates" });
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to create template";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsPending(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => router.navigate({ to: "/app/templates" })}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back
				</Button>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Create Message Template
					</h1>
					<p className="text-muted-foreground">
						Create a new WhatsApp message template for approval by Meta.
					</p>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Template Details</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							{error && (
								<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
									{error}
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor="waba">
									WhatsApp Business Account{" "}
									<span className="text-destructive">*</span>
								</Label>
								<Select
									value={wabaId}
									onValueChange={setWabaId}
									disabled={isPending}
								>
									<SelectTrigger id="waba">
										<SelectValue placeholder="Select WABA" />
									</SelectTrigger>
									<SelectContent>
										{wabas.map((waba: { id: string; name: string }) => (
											<SelectItem key={waba.id} value={waba.id}>
												{waba.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="name">
									Template Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="my_template_01"
									disabled={isPending}
								/>
								<p className="text-xs text-muted-foreground">
									Lowercase letters, numbers, and underscores only
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="language">
									Language <span className="text-destructive">*</span>
								</Label>
								<Select
									value={language}
									onValueChange={setLanguage}
									disabled={isPending}
								>
									<SelectTrigger id="language">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="en_US">English (US)</SelectItem>
										<SelectItem value="en_GB">English (UK)</SelectItem>
										<SelectItem value="es">Spanish</SelectItem>
										<SelectItem value="es_MX">Spanish (Mexico)</SelectItem>
										<SelectItem value="pt_BR">Portuguese (Brazil)</SelectItem>
										<SelectItem value="fr">French</SelectItem>
										<SelectItem value="de">German</SelectItem>
										<SelectItem value="it">Italian</SelectItem>
										<SelectItem value="ja">Japanese</SelectItem>
										<SelectItem value="ko">Korean</SelectItem>
										<SelectItem value="zh_CN">Chinese (Simplified)</SelectItem>
										<SelectItem value="ar">Arabic</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="category">
									Category <span className="text-destructive">*</span>
								</Label>
								<Select
									value={category}
									onValueChange={(val) => setCategory(val as typeof category)}
									disabled={isPending}
								>
									<SelectTrigger id="category">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="utility">Utility</SelectItem>
										<SelectItem value="marketing">Marketing</SelectItem>
										<SelectItem value="authentication">
											Authentication
										</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									Marketing templates require opt-in from recipients
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="header">Header (Optional)</Label>
								<Input
									id="header"
									value={headerText}
									onChange={(e) => setHeaderText(e.target.value)}
									placeholder="Welcome to our service!"
									disabled={isPending}
								/>
								<p className="text-xs text-muted-foreground">
									Use {`{{1}}`} for a variable in the header
								</p>
							</div>

							{headerVariableCount > 0 && (
								<div className="space-y-2">
									<Label htmlFor="headerExample">
										Header Example <span className="text-destructive">*</span>
									</Label>
									<Input
										id="headerExample"
										value={headerExample}
										onChange={(e) => setHeaderExample(e.target.value)}
										placeholder="John"
										disabled={isPending}
									/>
									<p className="text-xs text-muted-foreground">
										Provide an example value for the header variable
									</p>
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor="body">
									Body Text <span className="text-destructive">*</span>
								</Label>
								<Textarea
									id="body"
									value={bodyText}
									onChange={(e) => setBodyText(e.target.value)}
									placeholder="Hello {{1}}, your order {{2}} has been confirmed."
									rows={5}
									disabled={isPending}
								/>
								<p className="text-xs text-muted-foreground">
									Use {`{{1}}, {{2}}`}, etc. for variables
								</p>
							</div>

							{bodyVariableCount > 0 && (
								<div className="space-y-2">
									<Label>
										Body Examples <span className="text-destructive">*</span>
									</Label>
									{Array.from({ length: bodyVariableCount }, (_, i) => (
										<Input
											key={`body-example-var-${i + 1}`}
											value={bodyExamples[i] || ""}
											onChange={(e) => {
												const newExamples = [...bodyExamples];
												newExamples[i] = e.target.value;
												setBodyExamples(newExamples);
											}}
											placeholder={`Example for {{${i + 1}}}`}
											disabled={isPending}
										/>
									))}
									<p className="text-xs text-muted-foreground">
										Provide example values for each variable (required by Meta)
									</p>
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor="footer">Footer (Optional)</Label>
								<Input
									id="footer"
									value={footerText}
									onChange={(e) => setFooterText(e.target.value)}
									placeholder="Reply STOP to unsubscribe"
									disabled={isPending}
								/>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label>Buttons (Optional)</Label>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleAddButton}
										disabled={isPending || buttons.length >= 3}
									>
										<Plus className="mr-2 h-4 w-4" />
										Add Button
									</Button>
								</div>
								{buttons.map((button, index) => (
									<div
										key={`button-${index}-${button.type}`}
										className="flex gap-2 items-start"
									>
										<div className="flex-1 space-y-2">
											<Select
												value={button.type}
												onValueChange={(val) =>
													handleButtonChange(index, "type", val)
												}
												disabled={isPending}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="QUICK_REPLY">
														Quick Reply
													</SelectItem>
													<SelectItem value="URL">URL</SelectItem>
													<SelectItem value="PHONE_NUMBER">
														Phone Number
													</SelectItem>
												</SelectContent>
											</Select>
											<Input
												value={button.text}
												onChange={(e) =>
													handleButtonChange(index, "text", e.target.value)
												}
												placeholder="Button text"
												disabled={isPending}
											/>
											{button.type === "URL" && (
												<Input
													value={button.url || ""}
													onChange={(e) =>
														handleButtonChange(index, "url", e.target.value)
													}
													placeholder="https://example.com"
													disabled={isPending}
												/>
											)}
											{button.type === "PHONE_NUMBER" && (
												<Input
													value={button.phone_number || ""}
													onChange={(e) =>
														handleButtonChange(
															index,
															"phone_number",
															e.target.value,
														)
													}
													placeholder="+1234567890"
													disabled={isPending}
												/>
											)}
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => handleRemoveButton(index)}
											disabled={isPending}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>

							<div className="flex gap-2 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => router.navigate({ to: "/app/templates" })}
									disabled={isPending}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isPending}>
									{isPending ? "Creating..." : "Create Template"}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Preview</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="rounded-lg border bg-muted/50 p-4 space-y-3">
							{headerText && (
								<div className="font-semibold text-lg">
									{headerText.replace(
										/\{\{1\}\}/g,
										headerExample || "[Example]",
									)}
								</div>
							)}
							{bodyText && (
								<div className="whitespace-pre-wrap text-sm">
									{bodyText.replace(/\{\{(\d+)\}\}/g, (_match, num) => {
										const index = Number.parseInt(num) - 1;
										return bodyExamples[index] || `[Example ${num}]`;
									})}
								</div>
							)}
							{footerText && (
								<div className="text-xs text-muted-foreground">
									{footerText}
								</div>
							)}
							{buttons.length > 0 && (
								<div className="space-y-2 pt-2">
									{buttons.map((button, index) => (
										<div
											key={`preview-button-${index}-${button.type}`}
											className="rounded border bg-background p-2 text-center text-sm font-medium"
										>
											{button.text || "[Button text]"}
										</div>
									))}
								</div>
							)}
						</div>
						<p className="mt-4 text-xs text-muted-foreground">
							This is a preview of how your template might appear. The actual
							appearance may vary on different devices.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
