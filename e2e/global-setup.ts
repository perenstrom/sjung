import { emptyOutbox } from "./support/outbox";

/** Each run starts with an empty outbox, so no email from an earlier run is read. */
export default async function globalSetup(): Promise<void> {
  await emptyOutbox();
}
