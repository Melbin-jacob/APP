import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const UNSAFE_SQL = "String-built SQL invites injection. Use db.$queryRaw`...` / $executeRaw`...` (tagged templates are parameterised) or Prisma.sql.";

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Security guard rails (OWASP A03 injection, A05 misconfiguration).
      "no-restricted-properties": [
        "error",
        { property: "$queryRawUnsafe", message: UNSAFE_SQL },
        { property: "$executeRawUnsafe", message: UNSAFE_SQL },
      ],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "react/no-danger": "error",
    },
  },
];
