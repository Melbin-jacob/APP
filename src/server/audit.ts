import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditEntry = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipHash?: string;
};

export function audit(entry: AuditEntry, tx: Prisma.TransactionClient = db) {
  return tx.auditLog.create({ data: entry });
}
