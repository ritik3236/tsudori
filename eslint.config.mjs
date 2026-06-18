import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Ban native, timezone-sensitive Date getters. They read the instant on the
      // SERVER's clock (UTC in prod), so a UTC-stored date representing an IST
      // calendar day lands in the wrong month/day (the "1 Jun billed as May" bug).
      // Use appYearMonth()/Luxon helpers in src/lib/date-helper.ts instead.
      "no-restricted-syntax": [
        "error",
        {
          // getDay is intentionally excluded — it collides with domain methods
          // like attendanceApi.getDay() and this AST rule has no type info.
          selector:
            "CallExpression[callee.property.name=/^(getMonth|getFullYear|getDate|getHours|getMinutes|getSeconds)$/]",
          message:
            "Native Date getters read in the server's timezone — use appYearMonth()/Luxon helpers in src/lib/date-helper.ts so IST dates resolve correctly.",
        },
      ],
    },
  },
]);

export default eslintConfig;
