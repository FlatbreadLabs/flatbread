import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The docs example has no ESLint config of its own; don't let a stray root
  // config fail the production build. Lint is enforced at the monorepo level.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
