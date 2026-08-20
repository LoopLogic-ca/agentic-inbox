// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { create } from "zustand";

interface SelectionState {
	/** Ids of the currently checked messages. */
	selectedIds: Set<string>;
	/**
	 * Last row the user affirmatively clicked. Shift-click selects the range
	 * between this row and the clicked one, matching Explorer / Gmail.
	 */
	anchorId: string | null;

	toggle: (id: string) => void;
	setSelection: (ids: string[]) => void;
	selectRange: (ids: string[]) => void;
	clear: () => void;
	setAnchor: (id: string | null) => void;
}

/**
 * Multi-select state for the message list.
 *
 * Separate from `useUIStore` for the same reason as the command palette: the
 * existing store is destructured wholesale by nine components, so putting a
 * value here that changes on every checkbox click would re-render the sidebar,
 * header and agent panel along with it.
 */
export const useSelectionStore = create<SelectionState>((set) => ({
	selectedIds: new Set<string>(),
	anchorId: null,

	toggle: (id) =>
		set((state) => {
			const next = new Set(state.selectedIds);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return { selectedIds: next, anchorId: id };
		}),

	setSelection: (ids) => set({ selectedIds: new Set(ids) }),

	// Union rather than replace, so shift-clicking a second range extends the
	// selection instead of discarding the first one.
	selectRange: (ids) =>
		set((state) => {
			const next = new Set(state.selectedIds);
			for (const id of ids) next.add(id);
			return { selectedIds: next };
		}),

	clear: () => set({ selectedIds: new Set<string>(), anchorId: null }),

	setAnchor: (anchorId) => set({ anchorId }),
}));
