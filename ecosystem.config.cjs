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
        PORT: '4173'
      }
    }
  ]
};
