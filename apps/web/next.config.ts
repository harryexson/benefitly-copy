import type { NextConfig } from "next";
const nextConfig: NextConfig = { reactStrictMode: true, output: "standalone", transpilePackages: ["@benefitly/domain", "@benefitly/validation"] };
export default nextConfig;
