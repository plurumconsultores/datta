import type { NextConfig } from "next";
  const nextConfig: NextConfig = {
    // ...lo que ya tengas...
    experimental: {
      serverActions: {
        bodySizeLimit: '3mb',
      },
    },
  };
/*const nextConfig: NextConfig = {
  /* config options here 
};*/

export default nextConfig;
