import type { NextConfig } from 'next';
import path from 'path';
import webpack from 'webpack';

const nodeStub = path.join(__dirname, 'src/lib/empty-node-stub.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      path: false,
      os: false,
      stream: false,
      crypto: false,
      https: false,
      http: false,
      zlib: false
    };
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'node:fs': nodeStub,
      'node:path': nodeStub,
      'node:os': nodeStub,
      'node:stream': nodeStub,
      'node:crypto': nodeStub
    };
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, '');
      })
    );
    return config;
  }
};

export default nextConfig;
