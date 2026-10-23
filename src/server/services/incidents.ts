import { z } from "zod";
import { plainText } from "@/lib/sanitize";

// Security incident / breach register fields (PIPEDA s.10.3 record of breaches).
export const incidentFields = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(10_000),
  detectedAt: z.coerce.date(),
  occurredAt: z.coerce.date().nullable().optional(),
  status: z.enum(["OPEN", "CONTAINED", "CLOSED"]).optional(),
  personalData: z.boolean().optional(),
  dataTypes: z.string().trim().max(500).nullable().optional(),
  affectedCount: z.number().int().min(0).max(100_000_000).nullable().optional(),
  jurisdictions: z.string().trim().max(200).nullable().optional(),
  riskOfSignificantHarm: z.boolean().nullable().optional(),
  riskAssessment: z.string().trim().max(10_000).nullable().optional(),
  containment: z.string().trim().max(10_000).nullable().optional(),
  regulatorNotifiedAt: z.coerce.date().nullable().optional(),
  individualsNotifiedAt: z.coerce.date().nullable().optional(),
});

export const cleanIncident = <T extends Record<string, unknown>>(input: T) =>
  Object.fromEntries(Object.entries(input).map(([k, v]) => [k, typeof v === "string" ? plainText(v, 10_000) : v])) as T;
