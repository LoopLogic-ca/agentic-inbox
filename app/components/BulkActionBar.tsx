// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Button, Select, Tooltip, useKumoToastManager } from "@cloudflare/kumo";
import {
	ArchiveIcon,
	EnvelopeOpenIcon,
	EnvelopeSimpleIcon,
	TrashIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Folders } from "shared/folders";
import { useSelectionStore } from "~/hooks/useSelectionStore";
import { type BulkAction, useBulkEmailAction } from "~/queries/bulk";
import { useFolders } from "~/queries/folders";

interface BulkActionBarProps {
	mailboxId: string;
	/** Folder currently being viewed, hidden from the "Move to" list. */
	currentFolder?: string;
}

export default function BulkActionBar({
	mailboxId,
	currentFolder,
}: BulkActionBarProps) {
	const selectedIds = useSelectionStore((state) => state.selectedIds);
	const clear = useSelectionStore((state) => state.clear);
	const { data: folders = [] } = useFolders(mailboxId);
	const bulkAction = useBulkEmailAction();
	const toastManager = useKumoToastManager();
	const [moveValue, setMoveValue] = useState("");

	const count = selectedIds.size;
	if (count === 0) return null;

	const ids = Array.from(selectedIds);
	const label = `${count} selected`;

	const run = async (action: BulkAction, verb: string) => {
		if (action.type === "delete") {
			const confirmed = window.confirm(
				`Move ${count} message${count === 1 ? "" : "s"} to Trash?`,
			);
			if (!confirmed) return;
		}

		const { succeeded, failed } = await bulkAction.mutateAsync({
			mailboxId,
			ids,
			action,
		});

		// Clear the selection so the bar collapses and the rows aren't left
		// checked pointing at messages that have moved out of this folder.
		clear();

		if (failed > 0) {
			toastManager.add({
				title: `${succeeded} ${verb}, ${failed} failed`,
				variant: "error",
			});
		} else {
			toastManager.add({
				title: `${succeeded} message${succeeded === 1 ? "" : "s"} ${verb}`,
			});
		}
	};

	const moveTargets = folders.filter(
		(folder) => folder.id !== currentFolder && folder.id !== Folders.SPAM,
	);

	const busy = bulkAction.isPending;

	return (
		<div className="flex items-center gap-2 border-b border-kumo-line bg-kumo-tint px-4 py-2 md:px-5">
			<Tooltip content="Clear selection" side="bottom" asChild>
				<Button
					variant="ghost"
					shape="square"
					size="sm"
					icon={<XIcon size={16} />}
					onClick={clear}
					aria-label="Clear selection"
				/>
			</Tooltip>

			<span className="text-sm font-medium text-kumo-default">{label}</span>

			<div className="ml-auto flex items-center gap-1">
				{currentFolder !== Folders.ARCHIVE && (
					<Tooltip content="Archive" side="bottom" asChild>
						<Button
							variant="ghost"
							shape="square"
							size="sm"
							disabled={busy}
							icon={<ArchiveIcon size={16} />}
							onClick={() =>
								run({ type: "move", folderId: Folders.ARCHIVE }, "archived")
							}
							aria-label={`Archive ${label}`}
						/>
					</Tooltip>
				)}

				<Tooltip content="Mark read" side="bottom" asChild>
					<Button
						variant="ghost"
						shape="square"
						size="sm"
						disabled={busy}
						icon={<EnvelopeOpenIcon size={16} />}
						onClick={() => run({ type: "read", read: true }, "marked read")}
						aria-label={`Mark ${label} read`}
					/>
				</Tooltip>

				<Tooltip content="Mark unread" side="bottom" asChild>
					<Button
						variant="ghost"
						shape="square"
						size="sm"
						disabled={busy}
						icon={<EnvelopeSimpleIcon size={16} />}
						onClick={() => run({ type: "read", read: false }, "marked unread")}
						aria-label={`Mark ${label} unread`}
					/>
				</Tooltip>

				<Tooltip content="Delete" side="bottom" asChild>
					<Button
						variant="ghost"
						shape="square"
						size="sm"
						disabled={busy}
						icon={<TrashIcon size={16} />}
						onClick={() => run({ type: "delete" }, "deleted")}
						aria-label={`Delete ${label}`}
					/>
				</Tooltip>

				{moveTargets.length > 0 && (
					<Select
						aria-label="Move selected to folder"
						placeholder="Move to..."
						value={moveValue}
						disabled={busy}
						onValueChange={(value: string | null) => {
							if (!value) return;
							// Reset immediately so the same folder can be picked again
							// after the selection is rebuilt.
							setMoveValue("");
							run({ type: "move", folderId: value }, "moved");
						}}
						className="w-36"
					>
						{moveTargets.map((folder) => (
							<Select.Option key={folder.id} value={folder.id}>
								{folder.name}
							</Select.Option>
						))}
					</Select>
				)}
			</div>
		</div>
	);
}
