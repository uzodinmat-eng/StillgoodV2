import { execute, isoTimestamp, query } from "./client";

export type StoreMessageSenderRole = "admin" | "store";

export interface StoreMessage {
  id: string;
  storeId: string;
  senderRole: StoreMessageSenderRole;
  senderCustomerId: string | null;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export const STORE_MESSAGE_BODY_MAX = 2000;

interface StoreMessageRow {
  id: string;
  store_id: string;
  sender_role: string;
  sender_customer_id: string | null;
  body: string;
  created_at: Date | string;
  read_at: Date | string | null;
}

function hydrateMessageRow(row: StoreMessageRow): StoreMessage {
  return {
    id: row.id,
    storeId: row.store_id,
    senderRole: row.sender_role === "store" ? "store" : "admin",
    senderCustomerId: row.sender_customer_id,
    body: row.body,
    createdAt: isoTimestamp(row.created_at),
    readAt: row.read_at ? isoTimestamp(row.read_at) : null,
  };
}

// Newest-first in SQL, then reversed so the UI renders oldest-first.
export async function listStoreThread(
  storeId: string,
  limit = 100
): Promise<StoreMessage[]> {
  const id = storeId.trim();
  if (!id) return [];
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 100;
  const rows = await query<StoreMessageRow>(
    `select id, store_id, sender_role, sender_customer_id, body, created_at, read_at
     from public.store_messages
     where store_id = $1
     order by created_at desc
     limit $2`,
    [id, safeLimit]
  );
  return rows.reverse().map(hydrateMessageRow);
}

function validateBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Enter a message before sending.");
  }
  if (trimmed.length > STORE_MESSAGE_BODY_MAX) {
    throw new Error(`Keep messages under ${STORE_MESSAGE_BODY_MAX} characters.`);
  }
  return trimmed;
}

export async function sendStoreMessage(input: {
  storeId: string;
  senderRole: StoreMessageSenderRole;
  senderCustomerId?: string | null;
  body: string;
}): Promise<StoreMessage> {
  const storeId = input.storeId.trim();
  if (!storeId) throw new Error("Missing store id.");
  if (input.senderRole !== "admin" && input.senderRole !== "store") {
    throw new Error("Unknown sender role.");
  }
  const body = validateBody(input.body);
  const id = `sg_msg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  await execute(
    `insert into public.store_messages (id, store_id, sender_role, sender_customer_id, body)
     values ($1, $2, $3, $4, $5)`,
    [id, storeId, input.senderRole, input.senderCustomerId ?? null, body]
  );

  return {
    id,
    storeId,
    senderRole: input.senderRole,
    senderCustomerId: input.senderCustomerId ?? null,
    body,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
}
