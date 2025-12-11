import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TemplatesListSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-80" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-36" />
					<Skeleton className="h-10 w-36" />
				</div>
			</div>

			{/* Card with table */}
			<Card>
				<CardHeader>
					<Skeleton className="h-10 w-full" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* Table header */}
						<div className="flex items-center gap-4 border-b pb-3">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-28" />
							<Skeleton className="size-8 ml-auto" />
						</div>
						{/* Table rows */}
						{Array.from({ length: 5 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton list that never reorders
							<div key={i} className="flex items-center gap-4 py-3">
								<div className="space-y-1">
									<Skeleton className="h-4 w-40" />
									<Skeleton className="h-3 w-24" />
								</div>
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-6 w-20 rounded-full" />
								<Skeleton className="h-4 w-24" />
								<Skeleton className="size-8 ml-auto" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
