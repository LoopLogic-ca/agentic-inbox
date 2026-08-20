// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { XIcon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useCommandStore } from "~/hooks/useCommandStore";

/**
 * Single source of truth for the shortcut reference.
 *
 * This app is deliberately mouse-first: every action below also has a visible
 * control somewhere in the UI. Keep the list short — if a shortcut is added
 * without a mouse equivalent, add the mouse equivalent too.
 */
const SHORTCUT_GROUPS: {
	title: string;
	items: { keys: string[]; description: string }[];
}[] = [
	{
		title: "Anywhere",
		items: [
			{ keys: ["Ctrl", "K"], description: "Open the command palette" },
			{ keys: ["?"], description: "Open this shortcut reference" },
			{ keys: ["Esc"], description: "Close the palette, a dialog, or search" },
		],
	},
	{
		title: "Command palette",
		items: [
			{ keys: ["↑"], description: "Move to the previous command" },
			{ keys: ["↓"], description: "Move to the next command" },
			{ keys: ["↵"], description: "Run the highlighted command" },
		],
	},
	{
		title: "Message list (with the mouse)",
		items: [
			{ keys: ["Click"], description: "Open a message" },
			{ keys: ["Click", "checkbox"], description: "Select a single message" },
			{ keys: ["Ctrl", "Click"], description: "Add or remove one message from the selection" },
			{ keys: ["Shift", "Click"], description: "Select every message in a range" },
		],
	},
	{
		title: "Search box",
		items: [
			{ keys: ["↵"], description: "Run the search" },
			{ keys: ["Esc"], description: "Clear the search, then collapse it" },
		],
	},
];

function Key({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-kumo-line bg-kumo-control px-1.5 py-1 font-sans text-[11px] font-medium text-kumo-strong">
			{children}
		</kbd>
	);
}

export default function KeyboardShortcutsDialog() {
	const isOpen = useCommandStore((state) => state.isShortcutsOpen);
	const closeShortcuts = useCommandStore((state) => state.closeShortcuts);
	const panelRef = useRef<HTMLDivElement>(null);
	const restoreFocusRef = useRef<HTMLElement | null>(null);

	// Focus the panel so Escape reaches it, and restore focus on close.
	useEffect(() => {
		if (!isOpen) return;
		restoreFocusRef.current = document.activeElement as HTMLElement | null;
		const frame = requestAnimationFrame(() => panelRef.current?.focus());
		return () => {
			cancelAnimationFrame(frame);
			restoreFocusRef.current?.focus?.();
			restoreFocusRef.current = null;
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [isOpen]);

	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={closeShortcuts}
				onKeyDown={(event) => event.key === "Escape" && closeShortcuts()}
				role="button"
				tabIndex={-1}
				aria-label="Close keyboard shortcuts"
			/>

			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-label="Keyboard shortcuts"
				tabIndex={-1}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						closeShortcuts();
					}
				}}
				className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-kumo-line bg-kumo-elevated shadow-2xl outline-none"
			>
				<div className="flex items-center justify-between border-b border-kumo-line px-5 py-3.5">
					<h2 className="text-base font-semibold text-kumo-default">
						Keyboard shortcuts
					</h2>
					<button
						type="button"
						onClick={closeShortcuts}
						aria-label="Close"
						className="rounded p-1 text-kumo-subtle transition-colors hover:bg-kumo-tint hover:text-kumo-default"
					>
						<XIcon size={16} />
					</button>
				</div>

				<div className="overflow-y-auto px-5 py-4">
					<p className="mb-4 text-xs text-kumo-subtle">
						Everything here can also be done with the mouse — these are just
						the faster routes.
					</p>

					{SHORTCUT_GROUPS.map((group) => (
						<section key={group.title} className="mb-5 last:mb-0">
							<h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-kumo-subtle">
								{group.title}
							</h3>
							<dl className="space-y-1">
								{group.items.map((item) => (
									<div
										key={`${group.title}-${item.description}`}
										className="flex items-center justify-between gap-4 rounded px-2 py-1.5 odd:bg-kumo-recessed"
									>
										<dt className="text-sm text-kumo-strong">
											{item.description}
										</dt>
										<dd className="flex shrink-0 items-center gap-1">
											{item.keys.map((key, index) => (
												<span
													key={key}
													className="flex items-center gap-1"
												>
													{index > 0 && (
														<span className="text-[10px] text-kumo-inactive">
															+
														</span>
													)}
													<Key>{key}</Key>
												</span>
											))}
										</dd>
									</div>
								))}
							</dl>
						</section>
					))}
				</div>

				<div className="border-t border-kumo-line bg-kumo-recessed px-5 py-2.5 text-xs text-kumo-subtle">
					Press <Key>Esc</Key> to close.
				</div>
			</div>
		</div>,
		document.body,
	);
}
