import { describe, expect, it, vi } from "vitest";

vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/db");
vi.stubEnv("REDIS_URL", "redis://localhost:6379");
vi.stubEnv("APP_URL", "http://localhost:3000");
vi.stubEnv("NEXTAUTH_SECRET", "x".repeat(40));
vi.stubEnv("REVIEW_TOKEN_PEPPER", "y".repeat(40));
vi.stubEnv("CRON_SECRET", "z".repeat(40));
vi.stubEnv("EMAIL_FROM", "test@example.com");

const { base32Decode, base32Encode, totpAt, verifyTotp, generateRecoveryCodes, normaliseRecoveryCode } = await import("@/lib/totp");
const { seal, open } = await import("@/lib/secret-box");
const { canonical, chainHash } = await import("@/server/audit");
const { productionConfigProblems } = await import("@/server/startup-checks");

describe("TOTP (RFC 6238)", () => {
  // RFC 6238 Appendix B, SHA-1 seed "12345678901234567890": 8-digit codes; 6-digit = last 6.
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  it.each([
    [59, "287082"], [1111111109, "081804"], [1111111111, "050471"], [1234567890, "005924"], [2000000000, "279037"],
  ])("t=%i → %s", (t, code) => expect(totpAt(secret, Math.floor(t / 30))).toBe(code));

  it("base32 round-trips", () => expect(base32Decode(base32Encode(Buffer.from("hello world"))).toString()).toBe("hello world"));

  it("accepts ±1 step for clock drift, and refuses a replayed step", () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 30_000);
    expect(verifyTotp(secret, totpAt(secret, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(secret, totpAt(secret, step + 2), null, now)).toBeNull();
    expect(verifyTotp(secret, totpAt(secret, step), step, now)).toBeNull(); // already used
    expect(verifyTotp(secret, "12345", null, now)).toBeNull();
  });

  it("makes ten distinct recovery codes", () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}$/);
    expect(normaliseRecoveryCode("ab2c-de3f")).toBe("AB2CDE3F");
  });
});

describe("secret box (AES-256-GCM)", () => {
  it("round-trips and is randomised", () => {
    const a = seal("JBSWY3DPEHPK3PXP");
    expect(open(a)).toBe("JBSWY3DPEHPK3PXP");
    expect(seal("JBSWY3DPEHPK3PXP")).not.toBe(a);
  });
  it("detects tampering", () => {
    const [v, iv, tag, ct] = seal("secret").split(".");
    const flipped = Buffer.from(ct!, "base64url");
    flipped[0] ^= 1;
    expect(() => open([v, iv, tag, flipped.toString("base64url")].join("."))).toThrow();
  });
});

describe("audit hash chain", () => {
  const row = { actorId: "u1", action: "user.update", entityType: "User", entityId: "u2", metadata: { b: 1, a: [1, { y: 2, x: 1 }] }, ipHash: null, createdAt: new Date("2026-10-23T10:00:00.000Z") };
  it("canonical JSON ignores key order", () => expect(canonical({ b: 1, a: 2 })).toBe(canonical({ a: 2, b: 1 })));
  it("changes when any field or the previous hash changes", () => {
    const h = chainHash("prev", row);
    expect(chainHash("prev", { ...row })).toBe(h);
    expect(chainHash("prev", { ...row, action: "user.delete" })).not.toBe(h);
    expect(chainHash("prev", { ...row, metadata: { b: 2, a: [1, { y: 2, x: 1 }] } })).not.toBe(h);
    expect(chainHash("other", row)).not.toBe(h);
    expect(chainHash("prev", { ...row, createdAt: new Date("2026-10-23T10:00:00.001Z") })).not.toBe(h);
  });
});

describe("production startup checks", () => {
  const good = {
    NODE_ENV: "production", APP_URL: "https://homeservices.direct",
    NEXTAUTH_SECRET: "q8Zr3vT1pLx9WmB2nK7cY4dF6gH0jS5aE", REVIEW_TOKEN_PEPPER: "Vb6Nm2Qw8Er4Ty0Ui7Op3As5Df1Gh9JkL",
    CRON_SECRET: "Zx3Cv5Bn7Mq9Wp1Ol2Ik4Uj6Yh8Tg0RfE", MFA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    DATABASE_URL: "postgresql://app:S0me-Strong-Pass@db.internal:5432/hsd?sslmode=require", EMAIL_TRANSPORT: "ses",
  };
  it("passes a sound configuration", () => expect(productionConfigProblems(good).errors).toEqual([]));
  it("ignores development", () => expect(productionConfigProblems({ NODE_ENV: "development" }).errors).toEqual([]));
  it.each([
    ["the docker test secret", { NEXTAUTH_SECRET: "local-test-secret-change-me-0123456789abcdef" }],
    ["a short secret", { CRON_SECRET: "short" }],
    ["reused secrets", { REVIEW_TOKEN_PEPPER: "q8Zr3vT1pLx9WmB2nK7cY4dF6gH0jS5aE" }],
    ["no MFA key", { MFA_ENCRYPTION_KEY: undefined }],
    ["http APP_URL", { APP_URL: "http://homeservices.direct" }],
    ["default DB password", { DATABASE_URL: "postgresql://postgres:postgres@db:5432/hsd" }],
    ["admin MFA off", { REQUIRE_ADMIN_MFA: "false" }],
    ["console email", { EMAIL_TRANSPORT: "console" }],
  ])("refuses %s", (_label, patch) => expect(productionConfigProblems({ ...good, ...patch }).errors.length).toBeGreaterThan(0));
  it("allows the local Docker stack only on localhost", () => {
    const local = { NODE_ENV: "production", ALLOW_INSECURE_LOCAL_SECRETS: "true", NEXTAUTH_SECRET: "local-test-secret-change-me" };
    expect(productionConfigProblems({ ...local, APP_URL: "http://localhost:3000" }).errors).toEqual([]);
    expect(productionConfigProblems({ ...local, APP_URL: "https://homeservices.direct" }).errors.length).toBe(1);
  });
});
