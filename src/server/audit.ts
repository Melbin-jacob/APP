import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logEvent } from "./log";

export type AuditEntry = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipHash?: string;
};

// Any constant: serialises audit writes so each row chains onto the last one.
const AUDIT_LOCK = 7_271_001;

/** JSON with sorted keys, so the same content always hashes the same. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).filter((k) => obj[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}

type Hashable = { actorId: string | null; action: string; entityType: string; entityId: string | null; metadata: unknown; ipHash: string | null; createdAt: Date };

export function chainHash(prevHash: string | null, row: Hashable) {
  const body = canonical({ ...row, createdAt: row.createdAt.toISOString(), metadata: row.metadata ?? null });
  return createHash("sha256").update(`${prevHash ?? ""}\n${body}`).digest("hex");
}

/**
 * Appends a tamper-evident audit entry: hash = SHA-256(previous hash + this
 * entry). Editing or deleting any row breaks the chain from that point on,
 * which verifyAuditChain() detects. Also mirrored to the structured log.
 */
export async function audit(entry: AuditEntry, tx?: Prisma.TransactionClient) {
  const write = async (t: Prisma.TransactionClient) => {
    await t.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_LOCK})`;
    const last = await t.auditLog.findFirst({ orderBy: { seq: "desc" }, select: { hash: true } });
    const row: Hashable = {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      // Round-trip through JSON so what we hash is exactly what Postgres stores.
      metadata: entry.metadata === undefined ? null : JSON.parse(JSON.stringify(entry.metadata)),
      ipHash: entry.ipHash ?? null,
      createdAt: new Date(),
    };
    const prevHash = last?.hash ?? null;
    const created = await t.auditLog.create({
      data: { ...row, metadata: row.metadata ?? undefined, prevHash, hash: chainHash(prevHash, row) },
    });
    logEvent("audit", { action: row.action, entityType: row.entityType, entityId: row.entityId, actorId: row.actorId, auditId: created.id });
    return created;
  };
  return tx ? write(tx) : db.$transaction(write);
}

export type ChainReport = { checked: number; ok: boolean; brokenAt?: { seq: string; id: string; createdAt: Date; reason: string } };

/** Re-computes every hash in order. Rows written before chaining existed (no hash) are skipped. */
export async function verifyAuditChain(): Promise<ChainReport> {
  let checked = 0;
  let prev: string | null | undefined; // undefined = first hashed row (its predecessor may have expired)
  let cursor: bigint | undefined;
  for (;;) {
    const rows = await db.auditLog.findMany({
      where: { hash: { not: null }, ...(cursor !== undefined ? { seq: { gt: cursor } } : {}) },
      orderBy: { seq: "asc" },
      take: 1000,
    });
    if (!rows.length) return { checked, ok: true };
    for (const r of rows) {
      const fail = (reason: string) => ({ checked, ok: false, brokenAt: { seq: r.seq.toString(), id: r.id, createdAt: r.createdAt, reason } });
      if (prev !== undefined && r.prevHash !== prev) return fail("link to the previous entry is broken (an entry was removed or reordered)");
      const expected = chainHash(r.prevHash, { actorId: r.actorId, action: r.action, entityType: r.entityType, entityId: r.entityId, metadata: r.metadata, ipHash: r.ipHash, createdAt: r.createdAt });
      if (expected !== r.hash) return fail("content does not match its hash (the entry was altered)");
      prev = r.hash;
      checked++;
    }
    cursor = rows[rows.length - 1]!.seq;
  }
}

/** Adds each actor's email (when the account still exists) and makes rows JSON-safe. */
export async function withActors<T extends { actorId: string | null; seq: bigint }>(logs: T[]) {
  const ids = [...new Set(logs.map((l) => l.actorId).filter((v): v is string => !!v))];
  const users = ids.length ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } }) : [];
  const email = new Map(users.map((u) => [u.id, u.email]));
  return logs.map((l) => ({ ...l, seq: l.seq.toString(), actor: l.actorId ? { email: email.get(l.actorId) ?? `deleted user ${l.actorId}` } : null }));
}
