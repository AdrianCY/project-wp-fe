import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	ArrowLeft,
	ArrowRight,
	Calendar,
	Check,
	Megaphone,
	Send,
	Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
	approvedTemplatesQueryOptions,
	phoneNumbersQueryOptions,
	tagsForCampaignQueryOptions,
} from "@/queries/campaigns";
import {
	createCampaign,
	getContactsCountByTags,
	sendCampaign,
} from "@/server/campaigns";

export const Route = createFileRoute("/app/campaigns/create")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(phoneNumbersQueryOptions()),
			context.queryClient.ensureQueryData(approvedTemplatesQueryOptions()),
			context.queryClient.ensureQueryData(tagsForCampaignQueryOptions()),
		]);
	},
	pendingComponent: CampaignCreateSkeleton,
	component: CreateCampaignPage,
});

function CampaignCreateSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Skeleton className="h-9 w-20" />
				<div className="space-y-2">
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-72" />
				</div>
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-20 w-full" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

type Step = "details" | "audience" | "template" | "schedule" | "review";

function CreateCampaignPage() {
	const router = useRouter();
	const createCampaignFn = useServerFn(createCampaign);
	const sendCampaignFn = useServerFn(sendCampaign);
	const getContactsCountFn = useServerFn(getContactsCountByTags);

	const { data: phoneNumbers } = useSuspenseQuery(phoneNumbersQueryOptions());
	const { data: templates } = useSuspenseQuery(approvedTemplatesQueryOptions());
	const { data: tags } = useSuspenseQuery(tagsForCampaignQueryOptions());

	const [step, setStep] = useState<Step>("details");
	const [isPending, setIsPending] = useState(false);

	// Form state
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [phoneNumberId, setPhoneNumberId] = useState("");
	const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
	const [templateId, setTemplateId] = useState("");
	const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
	const [scheduledDate, setScheduledDate] = useState("");
	const [scheduledTime, setScheduledTime] = useState("");
	const [audienceCount, setAudienceCount] = useState<number | null>(null);
	const [templateVariables, setTemplateVariables] = useState<
		Record<string, string[]>
	>({});

	const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
		{
			id: "details",
			label: "Details",
			icon: <Megaphone className="h-4 w-4" />,
		},
		{ id: "audience", label: "Audience", icon: <Users className="h-4 w-4" /> },
		{ id: "template", label: "Template", icon: <Send className="h-4 w-4" /> },
		{
			id: "schedule",
			label: "Schedule",
			icon: <Calendar className="h-4 w-4" />,
		},
		{ id: "review", label: "Review", icon: <Check className="h-4 w-4" /> },
	];

	const currentStepIndex = steps.findIndex((s) => s.id === step);

	const selectedTemplate = templates.find((t) => t.id === templateId);
	const selectedPhone = phoneNumbers.find((p) => p.id === phoneNumberId);
	const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

	// Get variable counts from template
	const getVariableCount = (text: string): number => {
		const matches = text.match(/\{\{(\d+)\}\}/g);
		if (!matches) return 0;
		const numbers = matches.map((m) =>
			Number.parseInt(m.match(/\d+/)?.[0] || "0", 10),
		);
		return Math.max(...numbers, 0);
	};

	const templateComponents = selectedTemplate?.components as Array<{
		type: string;
		text?: string;
	}> | null;
	const headerComponent = templateComponents?.find((c) => c.type === "HEADER");
	const bodyComponent = templateComponents?.find((c) => c.type === "BODY");
	const headerVarCount = headerComponent?.text
		? getVariableCount(headerComponent.text)
		: 0;
	const bodyVarCount = bodyComponent?.text
		? getVariableCount(bodyComponent.text)
		: 0;

	const handleTagToggle = async (tagId: string) => {
		const newTagIds = selectedTagIds.includes(tagId)
			? selectedTagIds.filter((id) => id !== tagId)
			: [...selectedTagIds, tagId];
		setSelectedTagIds(newTagIds);

		if (newTagIds.length > 0) {
			try {
				const result = await getContactsCountFn({ data: newTagIds });
				setAudienceCount(result.count);
			} catch {
				setAudienceCount(null);
			}
		} else {
			setAudienceCount(null);
		}
	};

	const canProceed = (): boolean => {
		switch (step) {
			case "details":
				return !!name.trim() && !!phoneNumberId;
			case "audience":
				return selectedTagIds.length > 0;
			case "template":
				return !!templateId;
			case "schedule":
				return scheduleType === "now" || (!!scheduledDate && !!scheduledTime);
			case "review":
				return true;
			default:
				return false;
		}
	};

	const handleNext = () => {
		const nextIndex = currentStepIndex + 1;
		if (nextIndex < steps.length) {
			setStep(steps[nextIndex].id);
		}
	};

	const handleBack = () => {
		const prevIndex = currentStepIndex - 1;
		if (prevIndex >= 0) {
			setStep(steps[prevIndex].id);
		}
	};

	const handleSubmit = async (sendNow: boolean) => {
		setIsPending(true);

		try {
			let scheduledAt: string | undefined;
			if (scheduleType === "later" && scheduledDate && scheduledTime) {
				scheduledAt = new Date(
					`${scheduledDate}T${scheduledTime}`,
				).toISOString();
			}

			const result = await createCampaignFn({
				data: {
					name,
					description: description || undefined,
					phoneNumberId,
					templateId,
					tagIds: selectedTagIds,
					scheduledAt,
					templateVariables:
						Object.keys(templateVariables).length > 0
							? templateVariables
							: undefined,
				},
			});

			if (result.success) {
				if (sendNow && scheduleType === "now") {
					// Send immediately
					const sendResult = await sendCampaignFn({
						data: result.campaign.id,
					});
					toast.success(sendResult.message);
				} else {
					toast.success("Campaign created successfully");
				}
				router.navigate({ to: "/app/campaigns" });
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create campaign",
			);
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
					onClick={() => router.navigate({ to: "/app/campaigns" })}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back
				</Button>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
					<p className="text-muted-foreground">
						Send a template message to your contacts.
					</p>
				</div>
			</div>

			{/* Step Indicator */}
			<div className="flex items-center justify-center gap-2">
				{steps.map((s, index) => (
					<div key={s.id} className="flex items-center">
						<button
							type="button"
							onClick={() => index < currentStepIndex && setStep(s.id)}
							disabled={index > currentStepIndex}
							className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
								step === s.id
									? "bg-primary text-primary-foreground"
									: index < currentStepIndex
										? "bg-muted text-foreground hover:bg-muted/80"
										: "bg-muted/50 text-muted-foreground"
							}`}
						>
							{s.icon}
							<span className="hidden sm:inline">{s.label}</span>
						</button>
						{index < steps.length - 1 && (
							<div className="mx-2 h-px w-8 bg-border" />
						)}
					</div>
				))}
			</div>

			{/* Step Content */}
			<Card>
				<CardHeader>
					<CardTitle>{steps.find((s) => s.id === step)?.label}</CardTitle>
				</CardHeader>
				<CardContent>
					{step === "details" && (
						<div className="space-y-4 max-w-xl">
							<div className="space-y-2">
								<Label htmlFor="name">
									Campaign Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="My Marketing Campaign"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Optional description for internal reference"
									rows={3}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="phoneNumber">
									Sender Phone Number{" "}
									<span className="text-destructive">*</span>
								</Label>
								<Select value={phoneNumberId} onValueChange={setPhoneNumberId}>
									<SelectTrigger id="phoneNumber">
										<SelectValue placeholder="Select a phone number" />
									</SelectTrigger>
									<SelectContent>
										{phoneNumbers.map((phone) => (
											<SelectItem key={phone.id} value={phone.id}>
												{phone.displayName ||
													phone.displayPhoneNumber ||
													phone.phoneNumber}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{phoneNumbers.length === 0 && (
									<p className="text-sm text-destructive">
										No phone numbers available. Please connect a WhatsApp
										Business Account first.
									</p>
								)}
							</div>
						</div>
					)}

					{step === "audience" && (
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Select tags to define your audience. Contacts with any of the
								selected tags will receive the message.
							</p>

							<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{tags.map((tag) => (
									<button
										type="button"
										key={tag.id}
										className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-left ${
											selectedTagIds.includes(tag.id)
												? "border-primary bg-primary/5"
												: "hover:bg-muted/50"
										}`}
										onClick={() => handleTagToggle(tag.id)}
									>
										<Checkbox
											checked={selectedTagIds.includes(tag.id)}
											onCheckedChange={() => handleTagToggle(tag.id)}
										/>
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<div
													className="h-3 w-3 rounded-full"
													style={{ backgroundColor: tag.color || "#6b7280" }}
												/>
												<span className="font-medium">{tag.name}</span>
											</div>
										</div>
									</button>
								))}
							</div>

							{tags.length === 0 && (
								<p className="text-sm text-destructive">
									No tags available. Please create tags and assign them to
									contacts first.
								</p>
							)}

							{audienceCount !== null && (
								<div className="rounded-lg bg-muted p-4">
									<p className="text-lg font-semibold">
										{audienceCount.toLocaleString()} contact
										{audienceCount !== 1 ? "s" : ""} will receive this message
									</p>
								</div>
							)}
						</div>
					)}

					{step === "template" && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="template">
									Select Template <span className="text-destructive">*</span>
								</Label>
								<Select value={templateId} onValueChange={setTemplateId}>
									<SelectTrigger id="template">
										<SelectValue placeholder="Select an approved template" />
									</SelectTrigger>
									<SelectContent>
										{templates.map((template) => (
											<SelectItem key={template.id} value={template.id}>
												{template.name} ({template.language})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{templates.length === 0 && (
									<p className="text-sm text-destructive">
										No approved templates available. Please create and get
										templates approved first.
									</p>
								)}
							</div>

							{selectedTemplate && (
								<div className="rounded-lg border bg-muted/50 p-4 space-y-3">
									<div className="flex items-center gap-2 mb-2">
										<Badge variant="outline">{selectedTemplate.category}</Badge>
										<Badge variant="secondary">
											{selectedTemplate.language}
										</Badge>
									</div>
									{templateComponents?.map((component, idx) => {
										if (component.type === "HEADER" && component.text) {
											return (
												<div
													key={`component-${component.type}-${idx}`}
													className="font-semibold"
												>
													{component.text}
												</div>
											);
										}
										if (component.type === "BODY" && component.text) {
											return (
												<div
													key={`component-${component.type}-${idx}`}
													className="whitespace-pre-wrap text-sm"
												>
													{component.text}
												</div>
											);
										}
										if (component.type === "FOOTER" && component.text) {
											return (
												<div
													key={`component-${component.type}-${idx}`}
													className="text-xs text-muted-foreground"
												>
													{component.text}
												</div>
											);
										}
										return null;
									})}
								</div>
							)}

							{/* Variable inputs */}
							{headerVarCount > 0 && (
								<div className="space-y-2">
									<Label>Header Variables</Label>
									{Array.from({ length: headerVarCount }, (_, i) => {
										const varKey = `header-${templateId}-var-${i + 1}`;
										return (
											<Input
												key={varKey}
												value={templateVariables.HEADER?.[i] || ""}
												onChange={(e) => {
													const newVars = { ...templateVariables };
													if (!newVars.HEADER) newVars.HEADER = [];
													newVars.HEADER[i] = e.target.value;
													setTemplateVariables(newVars);
												}}
												placeholder={`Value for {{${i + 1}}}`}
											/>
										);
									})}
								</div>
							)}

							{bodyVarCount > 0 && (
								<div className="space-y-2">
									<Label>Body Variables</Label>
									{Array.from({ length: bodyVarCount }, (_, i) => {
										const varKey = `body-${templateId}-var-${i + 1}`;
										return (
											<Input
												key={varKey}
												value={templateVariables.BODY?.[i] || ""}
												onChange={(e) => {
													const newVars = { ...templateVariables };
													if (!newVars.BODY) newVars.BODY = [];
													newVars.BODY[i] = e.target.value;
													setTemplateVariables(newVars);
												}}
												placeholder={`Value for {{${i + 1}}}`}
											/>
										);
									})}
									<p className="text-xs text-muted-foreground">
										These values will be the same for all recipients. For
										personalized messages, use a different approach.
									</p>
								</div>
							)}
						</div>
					)}

					{step === "schedule" && (
						<div className="space-y-4 max-w-xl">
							<div className="space-y-4">
								<button
									type="button"
									className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors text-left w-full ${
										scheduleType === "now"
											? "border-primary bg-primary/5"
											: "hover:bg-muted/50"
									}`}
									onClick={() => setScheduleType("now")}
								>
									<Checkbox
										checked={scheduleType === "now"}
										onCheckedChange={() => setScheduleType("now")}
									/>
									<div>
										<div className="font-medium">Send Now</div>
										<div className="text-sm text-muted-foreground">
											Send the campaign immediately after creation
										</div>
									</div>
								</button>

								<button
									type="button"
									className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors text-left w-full ${
										scheduleType === "later"
											? "border-primary bg-primary/5"
											: "hover:bg-muted/50"
									}`}
									onClick={() => setScheduleType("later")}
								>
									<Checkbox
										checked={scheduleType === "later"}
										onCheckedChange={() => setScheduleType("later")}
									/>
									<div className="flex-1">
										<div className="font-medium">Schedule for Later</div>
										<div className="text-sm text-muted-foreground">
											Choose a specific date and time
										</div>
									</div>
								</button>

								{scheduleType === "later" && (
									<div className="grid gap-4 sm:grid-cols-2 pl-10">
										<div className="space-y-2">
											<Label htmlFor="date">Date</Label>
											<Input
												id="date"
												type="date"
												value={scheduledDate}
												onChange={(e) => setScheduledDate(e.target.value)}
												min={new Date().toISOString().split("T")[0]}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="time">Time</Label>
											<Input
												id="time"
												type="time"
												value={scheduledTime}
												onChange={(e) => setScheduledTime(e.target.value)}
											/>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{step === "review" && (
						<div className="space-y-6 max-w-xl">
							<div className="space-y-4">
								<div className="flex justify-between border-b pb-2">
									<span className="text-muted-foreground">Campaign Name</span>
									<span className="font-medium">{name}</span>
								</div>
								{description && (
									<div className="flex justify-between border-b pb-2">
										<span className="text-muted-foreground">Description</span>
										<span className="font-medium">{description}</span>
									</div>
								)}
								<div className="flex justify-between border-b pb-2">
									<span className="text-muted-foreground">Sender</span>
									<span className="font-medium">
										{selectedPhone?.displayName ||
											selectedPhone?.displayPhoneNumber ||
											selectedPhone?.phoneNumber}
									</span>
								</div>
								<div className="flex justify-between items-start border-b pb-2">
									<span className="text-muted-foreground">Audience</span>
									<div className="text-right">
										<div className="flex flex-wrap gap-1 justify-end">
											{selectedTags.map((tag) => (
												<Badge key={tag.id} variant="outline">
													{tag.name}
												</Badge>
											))}
										</div>
										{audienceCount !== null && (
											<div className="text-sm text-muted-foreground mt-1">
												{audienceCount.toLocaleString()} contacts
											</div>
										)}
									</div>
								</div>
								<div className="flex justify-between border-b pb-2">
									<span className="text-muted-foreground">Template</span>
									<span className="font-medium">
										{selectedTemplate?.name} ({selectedTemplate?.language})
									</span>
								</div>
								<div className="flex justify-between border-b pb-2">
									<span className="text-muted-foreground">Schedule</span>
									<span className="font-medium">
										{scheduleType === "now"
											? "Send immediately"
											: `${scheduledDate} at ${scheduledTime}`}
									</span>
								</div>
							</div>

							{selectedTemplate && (
								<div className="rounded-lg border bg-muted/50 p-4 space-y-2">
									<div className="text-sm font-medium mb-2">
										Message Preview
									</div>
									{templateComponents?.map((component, idx) => {
										if (component.type === "HEADER" && component.text) {
											return (
												<div
													key={`preview-${component.type}-${idx}`}
													className="font-semibold"
												>
													{component.text.replace(/\{\{(\d+)\}\}/g, (_m, n) => {
														return (
															templateVariables.HEADER?.[Number(n) - 1] ||
															`{{${n}}}`
														);
													})}
												</div>
											);
										}
										if (component.type === "BODY" && component.text) {
											return (
												<div
													key={`preview-${component.type}-${idx}`}
													className="whitespace-pre-wrap text-sm"
												>
													{component.text.replace(/\{\{(\d+)\}\}/g, (_m, n) => {
														return (
															templateVariables.BODY?.[Number(n) - 1] ||
															`{{${n}}}`
														);
													})}
												</div>
											);
										}
										if (component.type === "FOOTER" && component.text) {
											return (
												<div
													key={`preview-${component.type}-${idx}`}
													className="text-xs text-muted-foreground"
												>
													{component.text}
												</div>
											);
										}
										return null;
									})}
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Navigation */}
			<div className="flex justify-between">
				<Button
					variant="outline"
					onClick={handleBack}
					disabled={currentStepIndex === 0 || isPending}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back
				</Button>

				{step !== "review" ? (
					<Button onClick={handleNext} disabled={!canProceed() || isPending}>
						Next
						<ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				) : (
					<Button
						onClick={() => handleSubmit(scheduleType === "now")}
						disabled={isPending}
					>
						{isPending
							? "Creating..."
							: scheduleType === "now"
								? "Create & Send Now"
								: "Schedule Campaign"}
					</Button>
				)}
			</div>
		</div>
	);
}
