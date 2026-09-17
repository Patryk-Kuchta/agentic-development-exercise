import { once } from 'node:events';
import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { contract } from '@app/contract';
import { createApp } from '../../src/app';
import type { Db } from '../../src/db';

export interface TestServer {
  /** The same typed client the browser uses, pointed at a real local port. */
  client: ContractRouterClient<typeof contract>;
  /**
   * The same client, presenting a session token on every request — the browser's
   * signed-in state, expressed the way the browser expresses it.
   */
  clientFor: (token: string) => ContractRouterClient<typeof contract>;
  close: () => Promise<void>;
}

/**
 * Boots the real Express app on an ephemeral port (`0` lets the OS pick a free
 * one, so tests can run in parallel) and returns a client that talks to it over
 * genuine HTTP. Nothing is mocked: a test failure here is a failure a browser
 * would also see.
 */
export async function startTestServer(db: Db): Promise<TestServer> {
  const server = createApp(db).listen(0);
  await once(server, 'listening');

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error(`Expected the test server on a TCP port, got ${JSON.stringify(address)}`);
  }

  const url = `http://127.0.0.1:${String(address.port)}/api`;

  const connect = (headers: Record<string, string>): ContractRouterClient<typeof contract> =>
    createORPCClient(new OpenAPILink(contract, { url, headers: () => headers }));

  return {
    client: connect({}),
    clientFor: (token) => connect({ authorization: `Bearer ${token}` }),
    close: async () => {
      server.close();
      await once(server, 'close');
    },
  };
}
