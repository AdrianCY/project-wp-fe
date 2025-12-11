import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TemplateCreateSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Skeleton className="h-9 w-20" />
				<div className="space-y-2">
					<Skeleton className="h-9 w-64" />
					<Skeleton className="h-5 w-96" />
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Form Card */}
				<Card>
					<CardHeader>
						<CardTitle>Template Details</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{/* WABA Select */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-48" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Name Input */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-3 w-64" />
							</div>

							{/* Language Select */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Category Select */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-3 w-72" />
							</div>

							{/* Header Input */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Body Textarea */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-32 w-full" />
								<Skeleton className="h-3 w-48" />
							</div>

							{/* Footer Input */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Buttons Section */}
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-9 w-28" />
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex gap-2 pt-4">
								<Skeleton className="h-10 w-20" />
								<Skeleton className="h-10 w-32" />
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Preview Card */}
				<Card>
					<CardHeader>
						<CardTitle>Preview</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="rounded-lg border bg-muted/50 p-4 space-y-3">
							<Skeleton className="h-6 w-48" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-40 mt-2" />
						</div>
						<Skeleton className="h-3 w-full mt-4" />
						<Skeleton className="h-3 w-3/4 mt-1" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
