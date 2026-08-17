// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

// Bindings come from `wrangler types`, which regenerates worker-configuration.d.ts from
// wrangler.jsonc. POLICY_AUD and TEAM_DOMAIN are deliberately not redeclared here: they are
// declared as vars, so the generated Env already types them as the configured literal, and
// redeclaring them as `string` widens Env past the `Cloudflare.Env` constraint that
// McpAgent<Env> requires. If they are ever moved to secrets, add them back explicitly.
export interface Env extends Cloudflare.Env {}
