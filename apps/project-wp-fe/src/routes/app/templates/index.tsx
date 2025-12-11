import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Plus, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { TemplatesListSkeleton } from "@/components/templates/templates-list-skeleton";
import { TemplatesTable } from "@/components/templates/templates-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTemplates, syncTemplates } from "@/server/templates";

export const Route = createFileRoute("/app/templates/")({
	loaderDeps: ({ search }) => ({
		search: (search as { q?: string }).q || "",
		page: (search as { page?: number }).page || 1,
	}),
	loader: async ({ deps }) => {
		const result = await getTemplates({
			data: { search: deps.search, page: deps.page, pageSize: 20 },
		});
		return result;
	},
	pendingComponent: TemplatesListSkeleton,
	component: TemplatesPage,
});

function TemplatesPage() {
	const router = useRouter();
	const data = Route.useLoaderData();
	const { search } = Route.useLoaderDeps();
	const [searchInput, setSearchInput] = useState(search);
	const [isSyncing, setIsSyncing] = useState(false);

	const syncTemplatesFn = useServerFn(syncTemplates);

	const handleSearch = (value: string) => {
		setSearchInput(value);
	};

	const executeSearch = () => {
		router.navigate({
			to: "/app/templates",
			search: { q: searchInput || undefined, page: 1 },
		});
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			executeSearch();
		}
	};

	const handlePageChange = (newPage: number) => {
		router.navigate({
			to: "/app/templates",
			search: { q: search || undefined, page: newPage },
		});
	};

	const handleSync = async () => {
		setIsSyncing(true);
		try {
			const result = await syncTemplatesFn();
			alert(result.message);
			router.invalidate();
		} catch (error) {
			alert(
				error instanceof Error ? error.message : "Failed to sync templates",
			);
		} finally {
			setIsSyncing(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Message Templates
					</h1>
					<p className="text-muted-foreground">
						Manage your WhatsApp message templates for marketing campaigns.
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={handleSync} disabled={isSyncing}>
						<RefreshCw
							className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
						/>
						{isSyncing ? "Syncing..." : "Sync Templates"}
					</Button>
					<Button asChild>
						<Link to="/app/templates/create">
							<Plus className="mr-2 h-4 w-4" />
							Create Template
						</Link>
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center gap-4">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search templates by name..."
								value={searchInput}
								onChange={(e) => handleSearch(e.target.value)}
								onKeyDown={handleKeyDown}
								onBlur={executeSearch}
								className="pl-10"
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{data.templates && data.templates.length > 0 ? (
						<TemplatesTable
							data={data.templates}
							page={data.page}
							pageSize={data.pageSize}
							pageCount={data.totalPages}
							onPageChange={handlePageChange}
						/>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="rounded-full bg-muted p-4">
								<MessageSquare className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="mt-4 text-lg font-semibold">No templates found</h3>
							<p className="mt-2 max-w-sm text-sm text-muted-foreground">
								{search
									? "No templates match your search."
									: "You haven't synced any templates yet. Click the Sync button to fetch templates from Meta."}
							</p>
							{!search && (
								<Button
									className="mt-4"
									variant="outline"
									onClick={handleSync}
									disabled={isSyncing}
								>
									<RefreshCw
										className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
									/>
									{isSyncing ? "Syncing..." : "Sync Templates"}
								</Button>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
