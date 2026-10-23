-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'CONTAINED', 'CLOSED');

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "hash" TEXT,
ADD COLUMN     "prevHash" TEXT,
ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaEnabledAt" TIMESTAMP(3),
ADD COLUMN     "mfaLastStep" INTEGER,
ADD COLUMN     "mfaRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "userId" TEXT,
    "policyVersion" TEXT NOT NULL,
    "analytics" BOOLEAN NOT NULL,
    "ads" BOOLEAN NOT NULL,
    "gpc" BOOLEAN NOT NULL DEFAULT false,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "personalData" BOOLEAN NOT NULL DEFAULT false,
    "dataTypes" TEXT,
    "affectedCount" INTEGER,
    "jurisdictions" TEXT,
    "riskOfSignificantHarm" BOOLEAN,
    "riskAssessment" TEXT,
    "containment" TEXT,
    "regulatorNotifiedAt" TIMESTAMP(3),
    "individualsNotifiedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentRecord_subjectId_createdAt_idx" ON "ConsentRecord"("subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");

-- CreateIndex
CREATE INDEX "ConsentRecord_createdAt_idx" ON "ConsentRecord"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityIncident_status_detectedAt_idx" ON "SecurityIncident"("status", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_seq_key" ON "AuditLog"("seq");

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- Audit log is append-only: no UPDATE, no TRUNCATE, and DELETE only for rows
-- past the retention period (730 days; see src/server/services/retention.ts).
-- In production the app's database role must not own this table, so it
-- cannot disable these triggers (see docs/security/HOSTING_CHECKLIST.md).
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'AuditLog is append-only (UPDATE refused)';
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD."createdAt" > now() - interval '700 days' THEN
      RAISE EXCEPTION 'AuditLog rows can only be deleted after the retention period';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'AuditLog is append-only (TRUNCATE refused)';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only();
