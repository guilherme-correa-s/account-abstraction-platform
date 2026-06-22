import type { NextConfig } from "next";

// Web3 SDKs transpiled by Next so their modern ESM builds work everywhere.
const web3Packages = [
  "@privy-io/react-auth",
  "@zerodev/sdk",
  "@zerodev/ecdsa-validator",
  "permissionless",
  "viem",
  "@reservoir0x/relay-sdk",
];

// Next 16 runs Turbopack by default (`process.env.TURBOPACK` is set), and the
// viem-based stack needs no Node core polyfills in the browser. The webpack
// block is only attached when building with `--webpack`, so Turbopack runs
// don't emit a "webpack is configured while Turbopack is not" warning.
const webpackPolyfills: NonNullable<NextConfig["webpack"]> = (config) => {
  // Stub Node-only optional deps that some web3 packages reference.
  if (Array.isArray(config.externals)) {
    config.externals.push("pino-pretty", "lokijs", "encoding");
  }
  config.resolve = config.resolve ?? {};
  config.resolve.fallback = {
    ...(config.resolve.fallback ?? {}),
    fs: false,
    net: false,
    tls: false,
  };
  return config;
};

const nextConfig: NextConfig = {
  transpilePackages: web3Packages,
  ...(process.env.TURBOPACK ? {} : { webpack: webpackPolyfills }),
};

export default nextConfig;
