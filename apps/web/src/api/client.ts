import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient, InferContractRouterOutputs } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { contract } from '@app/contract';

/* OpenAPILink builds requests with `new URL(...)`, which needs an absolute URL,
   so /api is resolved against the page's own origin. Staying same-origin is what
   lets the Vite dev server proxy /api to the API process (see vite.config.ts)
   and is why the project never needs CORS. */
const link = new OpenAPILink(contract, { url: new URL('/api', window.location.origin) });

/**
 * The typed API client. Every method, argument and return type comes from the
 * contract in `packages/contract` — nothing here is hand-written, so a change to
 * the schema surfaces as a compile error in the components that consume it.
 */
export const client: ContractRouterClient<typeof contract> = createORPCClient(link);

/**
 * React Query bindings for the same client: `orpc.stats.queryOptions()` produces
 * the query key and query function, so call sites never invent either.
 *
 * Adding a procedure to the contract makes it appear here automatically; there
 * is no per-endpoint wiring to write.
 */
export const orpc = createTanstackQueryUtils(client);

/**
 * Response shapes, derived from the contract's Zod output schemas rather than
 * re-declared here: `ApiOutputs['stats']` is exactly what `GET /api/stats`
 * returns. Components that need to name a payload use this.
 */
export type ApiOutputs = InferContractRouterOutputs<typeof contract>;
