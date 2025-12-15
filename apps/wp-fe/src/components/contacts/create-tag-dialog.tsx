import { Tag } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateTagDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateTag: (data: { name: string; color: string }) => void;
	isPending: boolean;
}

export function CreateTagDialog({
	open,
	onOpenChange,
	onCreateTag,
	isPending,
}: CreateTagDialogProps) {
	const [name, setName] = useState("");
	const [color, setColor] = useState("#6b7280");
	const tagNameId = useId();
	const tagColorId = useId();

	const handleCreate = () => {
		if (name.trim()) {
			onCreateTag({ name: name.trim(), color });
		}
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setName("");
			setColor("#6b7280");
		}
		onOpenChange(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New Tag</DialogTitle>
					<DialogDescription>
						Create a new tag to organize your contacts
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor={tagNameId}>Tag Name</Label>
						<Input
							id={tagNameId}
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., VIP, Newsletter, Leads"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={tagColorId}>Color</Label>
						<div className="flex items-center gap-2">
							<input
								type="color"
								id={tagColorId}
								value={color}
								onChange={(e) => setColor(e.target.value)}
								className="h-10 w-20 cursor-pointer rounded border"
							/>
							<Badge
								style={{
									backgroundColor: `${color}20`,
									color: color,
									borderColor: color,
								}}
							>
								Preview
							</Badge>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={!name.trim() || isPending}>
						<Tag className="mr-2 size-4" />
						{isPending ? "Creating..." : "Create Tag"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
