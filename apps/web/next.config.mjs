/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],

  // Prevent Next.js from bundling native-binding packages used in Server Actions.
  // mongoose uses kerberos / native TLS bindings that must stay as external requires.
  serverExternalPackages: ["mongoose"],
}

export default nextConfig
