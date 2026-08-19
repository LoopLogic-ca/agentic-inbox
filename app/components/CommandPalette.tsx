// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import {
	ArchiveIcon,
	EnvelopeSimpleIcon,
	FileIcon,
	GearSixIcon,
	MagnifyingGlassIcon,
	PaperPlaneTiltIcon,
	PencilSimpleIcon,
	RobotIcon,
	TrashIcon,
	TrayIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { Folders } from "shared/folders";
import { useCommandStore } from "~/hooks/useCommandStore";
import { useUIStore } from "~/hooks/useUIStore";

type CommandSection = "Navigation" | "Actions";

interface Command {
	id: string;
	section: CommandSection;
	label: string;
	/** Extra terms folded into matching but never displayed. */
	keywords?: string;
	icon: React.ReactNode;
	run: () => void;
}

/** Order sections render in, regardless of the order commands are declared. */
const SECTION_ORDER: CommandSection[] = ["Navigation", "Actions"];

function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-kumo-line bg-kumo-control px-1.5 py-0.5 font-sans text-[11px] font-medium text-kumo-subtle">
			{children}
		</kbd>
	);
}

export default function CommandPalette() {
	// Subscribe only to the two values that actually change. Store actions are
	// stable references, so selecting them never causes a render.
	const isOpen = useCommandStore((state) => state.isOpen);
	const query = useCommandStore((state) => state.query);
	const setQuery = useCommandStore((state) => state.setQuery);
	const closePalette = useCommandStore((state) => state.closePalette);

	const navigate = useNavigate();
	const location = useLocation();

	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const restoreFocusRef = useRef<HTMLElement | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);

	// The palette mounts at the root, above the `/mailbox/:mailboxId` route, so
	// `useParams()` here would be empty. Read the id off the pathname instead.
	const mailboxId = useMemo(() => {
		const match = /^\/mailbox\/([^/]+)/.exec(location.pathname);
		return match ? decodeURIComponent(match[1]) : null;
	}, [location.pathname]);

	const commands = useMemo<Command[]>(() => {
		// Every command closes the palette before acting, so the resulting
		// navigation or panel toggle is visible instead of hidden behind it.
		const run = (action: () => void) => () => {
			closePalette();
			action();
		};

		const list: Command[] = [];

		if (mailboxId) {
			const folder = (id: string) => `/mailbox/${mailboxId}/emails/${id}`;

			list.push(
				{
					id: "go-inbox",
					section: "Navigation",
					label: "Go to Inbox",
					keywords: "mail unread received",
					icon: <TrayIcon size={18} />,
					run: run(() => navigate(folder(Folders.INBOX))),
				},
				{
					id: "go-sent",
					section: "Navigation",
					label: "Go to Sent",
					keywords: "outbox delivered",
					icon: <PaperPlaneTiltIcon size={18} />,
					run: run(() => navigate(folder(Folders.SENT))),
				},
				{
					id: "go-drafts",
					section: "Navigation",
					label: "Go to Drafts",
					keywords: "unsent unfinished",
					icon: <FileIcon size={18} />,
					run: run(() => navigate(folder(Folders.DRAFT))),
				},
				{
					id: "go-archive",
					section: "Navigation",
					label: "Go to Archive",
					keywords: "stored old",
					icon: <ArchiveIcon size={18} />,
					run: run(() => navigate(folder(Folders.ARCHIVE))),
				},
				{
					id: "go-trash",
					section: "Navigation",
					label: "Go to Trash",
					keywords: "deleted bin removed",
					icon: <TrashIcon size={18} />,
					run: run(() => navigate(folder(Folders.TRASH))),
				},
				{
					id: "go-settings",
					section: "Navigation",
					label: "Open mailbox settings",
					keywords: "preferences signature forwarding config",
					icon: <GearSixIcon size={18} />,
					run: run(() => navigate(`/mailbox/${mailboxId}/settings`)),
				},
				{
					id: "compose",
					section: "Actions",
					label: "Compose new email",
					keywords: "write send new message draft",
					icon: <PencilSimpleIcon size={18} />,
					// Read the UI store lazily. Subscribing to it here would
					// re-render the palette on every email selection.
					run: run(() =>
						useUIStore
							.getState()
							.startCompose({ mode: "new", originalEmail: null }),
					),
				},
				{
					id: "toggle-agent",
					section: "Actions",
					label: "Toggle agent panel",
					keywords: "assistant ai chat sidebar",
					icon: <RobotIcon size={18} />,
					run: run(() => useUIStore.getState().toggleAgentPanel()),
				},
			);
		}

		list.push({
			id: "go-mailboxes",
			section: "Navigation",
			label: "Go to all mailboxes",
			keywords: "home accounts switch",
			icon: <EnvelopeSimpleIcon size={18} />,
			run: run(() => navigate("/")),
		});

		return list;
	}, [mailboxId, navigate, closePalette]);

	const results = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return commands;

		const matched = commands.filter((command) =>
			`${command.label} ${command.keywords ?? ""}`.toLowerCase().includes(needle),
		);

		// Text that matches no command is still useful as a mail search, so
		// always offer it as a final option.
		if (mailboxId) {
			const term = query.trim();
			matched.push({
				id: "search-emails",
				section: "Actions",
				label: `Search emails for "${term}"`,
				icon: <MagnifyingGlassIcon size={18} />,
				run: () => {
					closePalette();
					navigate(`/mailbox/${mailboxId}/search?q=${encodeURIComponent(term)}`);
				},
			});
		}

		return matched;
	}, [commands, query, mailboxId, navigate, closePalette]);

	const groups = useMemo(
		() =>
			SECTION_ORDER.map((section) => ({
				section,
				items: results.filter((command) => command.section === section),
			})).filter((group) => group.items.length > 0),
		[results],
	);

	// Keep the highlight on the first result as the query narrows.
	useEffect(() => {
		setActiveIndex(0);
	}, [query, isOpen]);

	// Focus the input once the overlay has painted. `autoFocus` is unreliable
	// for an element that mounts into a portal in response to a keystroke.
	useEffect(() => {
		if (!isOpen) return;
		const frame = requestAnimationFrame(() => inputRef.current?.focus());
		return () => cancelAnimationFrame(frame);
	}, [isOpen]);

	// Return focus to whatever the user was on before the palette opened.
	useEffect(() => {
		if (!isOpen) return;
		restoreFocusRef.current = document.activeElement as HTMLElement | null;
		return () => {
			restoreFocusRef.current?.focus?.();
			restoreFocusRef.current = null;
		};
	}, [isOpen]);

	// Lock background scrolling while the overlay is up.
	useEffect(() => {
		if (!isOpen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [isOpen]);

	// Keep the highlighted row visible during arrow-key navigation.
	useEffect(() => {
		if (!isOpen) return;
		listRef.current
			?.querySelector<HTMLElement>('[data-active="true"]')
			?.scrollIntoView({ block: "nearest" });
	}, [activeIndex, isOpen]);

	if (!isOpen || typeof document === "undefined") return null;

	const activeCommand = results[activeIndex];

	const handleKeyDown = (event: React.KeyboardEvent) => {
		switch (event.key) {
			case "Escape":
				event.preventDefault();
				closePalette();
				break;
			case "ArrowDown":
				if (results.length === 0) return;
				event.preventDefault();
				setActiveIndex((index) => (index + 1) % results.length);
				break;
			case "ArrowUp":
				if (results.length === 0) return;
				event.preventDefault();
				setActiveIndex((index) => (index - 1 + results.length) % results.length);
				break;
			case "Home":
				event.preventDefault();
				setActiveIndex(0);
				break;
			case "End":
				if (results.length === 0) return;
				event.preventDefault();
				setActiveIndex(results.length - 1);
				break;
			case "Enter":
				event.preventDefault();
				results[activeIndex]?.run();
				break;
			case "Tab":
				// Single-input dialog: trap focus rather than letting Tab walk
				// into the page behind the overlay.
				event.preventDefault();
				break;
			default:
				break;
		}
	};

	// Portalled to `document.body` so the z-50 overlay can never be clipped by
	// a stacking context created somewhere in the provider tree.
	return createPortal(
		<div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={closePalette}
				onKeyDown={(event) => event.key === "Escape" && closePalette()}
				role="button"
				tabIndex={-1}
				aria-label="Close command palette"
			/>

			<div
				role="dialog"
				aria-modal="true"
				aria-label="Command palette"
				onKeyDown={handleKeyDown}
				className="relative w-full max-w-xl overflow-hidden rounded-xl border border-kumo-line bg-kumo-elevated shadow-2xl"
			>
				{/* Search input */}
				<div className="flex items-center gap-3 border-b border-kumo-line px-4">
					<MagnifyingGlassIcon size={18} className="shrink-0 text-kumo-subtle" />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Type a command or search..."
						className="w-full bg-transparent py-4 text-base text-kumo-default outline-none placeholder:text-kumo-inactive"
						role="combobox"
						aria-expanded="true"
						aria-controls="command-palette-list"
						aria-activedescendant={
							activeCommand ? `command-option-${activeCommand.id}` : undefined
						}
						aria-autocomplete="list"
						autoComplete="off"
						spellCheck={false}
					/>
					<Kbd>Ctrl K</Kbd>
				</div>

				{/* Results */}
				<div
					ref={listRef}
					id="command-palette-list"
					role="listbox"
					aria-label="Commands"
					className="max-h-[min(24rem,50vh)] overflow-y-auto py-2"
				>
					{results.length === 0 ? (
						<p className="px-4 py-8 text-center text-sm text-kumo-subtle">
							No matching commands.
						</p>
					) : (
						groups.map((group) => (
							<div key={group.section}>
								<div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-kumo-subtle">
									{group.section}
								</div>
								{group.items.map((command) => {
									const index = results.indexOf(command);
									const isActive = index === activeIndex;
									return (
										<button
											key={command.id}
											id={`command-option-${command.id}`}
											type="button"
											role="option"
											aria-selected={isActive}
											data-active={isActive}
											onClick={command.run}
											onMouseMove={() => setActiveIndex(index)}
											className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
												isActive
													? "bg-kumo-fill text-kumo-default"
													: "text-kumo-strong hover:bg-kumo-tint"
											}`}
										>
											<span
												className={`shrink-0 ${
													isActive ? "text-kumo-default" : "text-kumo-subtle"
												}`}
											>
												{command.icon}
											</span>
											<span className="flex-1 truncate">{command.label}</span>
											{isActive && (
												<span className="shrink-0 text-xs text-kumo-subtle">
													&#8629;
												</span>
											)}
										</button>
									);
								})}
							</div>
						))
					)}
				</div>

				{/* Footer hints */}
				<div className="flex items-center justify-between gap-4 border-t border-kumo-line bg-kumo-recessed px-4 py-2.5 text-xs text-kumo-subtle">
					<div className="flex items-center gap-3">
						<span className="hidden items-center gap-1 sm:flex">
							<Kbd>&#8593;</Kbd>
							<Kbd>&#8595;</Kbd>
							<span className="ml-0.5">to navigate</span>
						</span>
						<span className="flex items-center gap-1">
							<Kbd>&#8629;</Kbd>
							<span className="ml-0.5">to select</span>
						</span>
					</div>
					<span className="flex items-center gap-1">
						<Kbd>Esc</Kbd>
						<span className="ml-0.5">to close</span>
					</span>
				</div>
			</div>
		</div>,
		document.body,
	);
}
