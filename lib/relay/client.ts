import { createClient, getClient } from "@relayprotocol/relay-sdk";

// Relay SDK client (mainnet). Quotes hit the public Relay API (no key needed),
// so this runs client-side. Initialized lazily and reused as a singleton.
let created = false;

export function relayClient() {
  if (!created) {
    createClient({ baseApiUrl: "https://api.relay.link", source: "aa-platform" });
    created = true;
  }
  const client = getClient();
  if (!client) throw new Error("Relay client failed to initialize");
  return client;
}
