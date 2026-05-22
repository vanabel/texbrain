/** PM2: static TeXbrain site + optional isomorphic-git CORS proxy for browser Git push/pull. */
const corsPort = process.env.GIT_CORS_PROXY_PORT || '9999';
const corsAllowOrigin = process.env.GIT_CORS_ALLOW_ORIGIN || 'https://tex.vanabel.cn';

module.exports = {
  apps: [
    {
      name: 'texbrain',
      cwd: __dirname,
      script: 'pnpm',
      args: 'run serve:prod',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '4173'
      }
    },
    {
      name: 'texbrain-cors-proxy',
      cwd: __dirname,
      script: 'pnpm',
      args: `exec cors-proxy run -p ${corsPort}`,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        ALLOW_ORIGIN: corsAllowOrigin,
        PORT: corsPort
      }
    }
  ]
};
