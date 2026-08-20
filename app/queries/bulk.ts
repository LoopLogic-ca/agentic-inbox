// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "~/services/api";
import { queryKeys } from "./keys";

/**
 * Bulk message operations.
 *
 * These call the single-message endpoints directly rather than looping the
 * per-email mutation hooks, because each of those invalidates the email and
 * folder caches in its own `onSettled`. Archiving 25 messages that way fires
 * 50 invalidations and a refetch storm. Here the requests run concurrently and
 * the cache is invalidated exactly once, after everything has settled.
 */

/** Cap on in-flight requests so a large selection can't open 100 sockets. */
const CONCURRENCY = 6;

async function runPooled<T>(
	items: T[],
	task: (item: T) => Promise<unknown>,
): Promise<{ succeeded: number; failed: number }> {
	let cursor = 0;
	let succeeded = 0;
	let failed = 0;

	const workers = Array.from(
		{ length: Math.min(CONCURRENCY, items.length) },
		async () => {
			while (cursor < items.length) {
				const item = items[cursor++];
				try {
					await task(item);
					succeeded++;
				} catch {
					// Keep going: one failed message shouldn't abandon the rest of
					// the batch. The caller reports the tally.
					failed++;
				}
			}
		},
	);

	await Promise.all(workers);
	return { succeeded, failed };
}

export type BulkAction =
	| { type: "move"; folderId: string }
	| { type: "delete" }
	| { type: "read"; read: boolean };

export function useBulkEmailAction() {
	const qc = useQueryClient();

	return useMutation({
		mutationFn: async ({
			mailboxId,
			ids,
			action,
		}: { mailboxId: string; ids: string[]; action: BulkAction }) => {
			return runPooled(ids, (id) => {
				switch (action.type) {
					case "move":
						return api.moveEmail(mailboxId, id, action.folderId);
					case "delete":
						return api.deleteEmail(mailboxId, id);
					case "read":
						return api.updateEmail(mailboxId, id, { read: action.read });
				}
			});
		},
		onSettled: (_data, _err, { mailboxId }) => {
			qc.invalidateQueries({ queryKey: ["emails", mailboxId] });
			qc.invalidateQueries({ queryKey: queryKeys.folders.list(mailboxId) });
		},
	});
}
