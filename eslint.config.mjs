import nextConfig from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // Build output and local tool folders (agent worktrees carry their own .next).
  { ignores: [".next/**", "out/**", "build/**", "dist/**", "coverage/**", ".claude/**", ".agents/**", ".codex/**", ".cursor/**", "next-env.d.ts"] },
  ...nextConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/rules-of-hooks": "error",
      "@next/next/no-img-element": "warn",
      "react/no-unescaped-entities": "warn",
    }
  }
];

export default eslintConfig;
