import nextConfig from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
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
