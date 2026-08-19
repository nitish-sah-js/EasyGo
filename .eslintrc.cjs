module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "next/core-web-vitals"],
  ignorePatterns: ["node_modules", ".next", "dist", "coverage", "next-env.d.ts"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": "error"
  },
  overrides: [
    {
      files: ["apps/api/**/*.ts", "apps/worker/**/*.ts", "prisma/**/*.ts"],
      env: {
        node: true
      }
    }
  ]
};
