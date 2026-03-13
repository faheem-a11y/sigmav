import { createClient, type Client } from "@libsql/client";
import { initializeSchema } from "./schema";

let _client: Client | null = null;
let _initialized = false;

function getClient(): Client {
  if (_client) return _client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL environment variable is not set");
  }

  _client = createClient({ url, authToken });
  return _client;
}

export async function getDb(): Promise<Client> {
  const client = getClient();
  if (!_initialized) {
    await initializeSchema(client);
    _initialized = true;
  }
  return client;
}
