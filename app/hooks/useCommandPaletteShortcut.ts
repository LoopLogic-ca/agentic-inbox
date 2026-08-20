// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { useEffect } from "react";
import { useCommandStore } from "~/hooks/useCommandStore";

/**
 * True when the keystroke landed in somewhere the user is typing. Bare-key
 * shortcuts must stay inert there, or "?" becomes impossible to type into an
 * email.
 */
function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	return (
		tag === "INPUT" ||
		tag === "TEXTAREA" ||
		tag === "SELECT" ||
		target.isContentEditable
	);
}

/**
 * Binds the global Ctrl+K (Cmd+K on macOS) shortcut that toggles the command
 * palette.
 *
 * Mounted once, in the root layout. The listener is attached to `window` in
 * the capture phase so it wins over any per-field `onKeyDown` handler further
 * down the tree — notably the Header's search input — and fires no matter what
 * currently holds focus.
 *
 * This hook intentionally reads the store through `getState()` instead of
 * subscribing. Its host is the root layout, and a subscription there would
 * re-render the entire application tree every time the palette opened or
 * closed. The effect has an empty dependency list, so the listener is attached
 * exactly once for the lifetime of the app.
 */
export function useCommandPaletteShortcut() {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Ignore auto-repeat so holding the chord can't strobe the palette.
			if (event.repeat) return;

			// "?" opens the shortcut reference. Bare key, so it only applies
			// outside text fields and never with a modifier held.
			if (
				event.key === "?" &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.altKey &&
				!isTypingTarget(event.target)
			) {
				event.preventDefault();
				useCommandStore.getState().openShortcuts();
				return;
			}

			// `code` is the fallback for non-Latin keyboard layouts, where the
			// physical K key reports a non-"k" `key` value.
			const isKKey =
				event.key === "k" || event.key === "K" || event.code === "KeyK";
			if (!isKKey) return;

			// Ctrl on Windows/Linux, Cmd on macOS. Ctrl+Alt is AltGr on several
			// Windows layouts, so bail out rather than hijacking a character key.
			if (!(event.ctrlKey || event.metaKey) || event.altKey) return;

			// Block the browser's native Ctrl+K (search / address-bar focus on
			// Chrome, Edge and Firefox for Windows).
			event.preventDefault();
			event.stopPropagation();

			useCommandStore.getState().togglePalette();
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () =>
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
	}, []);
}
