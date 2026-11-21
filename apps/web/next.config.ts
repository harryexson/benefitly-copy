import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@benefitly/domain", "@benefitly/validation", "@benefitly/payments"],
  async headers() {
    // Only the embeddable campaign summary may be framed by other websites. Every other page keeps
    // the default framing protection.
    return [
      {
        source: "/f/:slug/embed",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
    ];
  },
  webpack: (config) => {
    // Workspace packages import their own siblings with explicit ".js" specifiers (required by
    // "moduleResolution": "NodeNext" for their own `tsc` typechecking), but the source files are
    // ".ts". Webpack's default resolver doesn't remap that extension for bundled packages, so
    // without this alias every cross-file import inside @benefitly/* fails to resolve at build time.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};
export default nextConfig;
