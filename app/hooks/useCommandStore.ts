// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { create } from "zustand";

interface CommandState {
	/** Whether the command palette overlay is currently visible. */
	isOpen: boolean;
	/** Text typed into the palette's search input. */
	query: string;

	openPalette: () => void;
	closePalette: () => void;
	togglePalette: () => void;
	setQuery: (query: string) => void;
}

/**
 * Global command palette state.
 *
 * Deliberately kept separate from `useUIStore`. The palette lives at the root
 * of the app on every route, so folding it into the inbox store would make it
 * re-render on unrelated churn (email selection, compose, sidebar toggles) and
 * would equally make every existing `useUIStore()` consumer re-render each time
 * the palette opened or a character was typed into it.
 *
 * Action identities are created once and never replaced, so components may
 * select them individually (`useCommandStore((s) => s.closePalette)`) without
 * ever subscribing to a changing value.
 */
export const useCommandStore = create<CommandState>((set) => ({
	isOpen: false,
	query: "",

	openPalette: () => set({ isOpen: true, query: "" }),

	// Clear the query on close so the palette always reopens in a clean state
	// rather than showing the previous session's filter.
	closePalette: () => set({ isOpen: false, query: "" }),

	togglePalette: () => set((state) => ({ isOpen: !state.isOpen, query: "" })),

	setQuery: (query) => set({ query }),
}));
