import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ContactsListSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-9 w-32" />
					<Skeleton className="h-5 w-64" />
				</div>
				<Skeleton className="h-10 w-32" />
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
							<Skeleton className="size-4" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-20" />
						</div>
						{/* Table rows */}
						{Array.from({ length: 5 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton list that never reorders
							<div key={i} className="flex items-center gap-4 py-2">
								<Skeleton className="size-4" />
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-6 w-16 rounded-full" />
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
