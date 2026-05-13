module.exports = {
  apps: [
    {
      name: 'pokhara-invoice',
      script: './server.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        WORKERS: 'max'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Performance optimizations
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Auto restart on file changes (dev only)
      watch: process.env.NODE_ENV === 'development' ? ['server.js', 'routes/', 'lib/'] : false,
      ignore_watch: ['node_modules', 'logs', 'public/uploads'],
      
      // Monitoring
      monitoring: true
    }
  ],
  
  deploy: {
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/pokhara-invoice.git',
      path: '/var/www/pokhara-invoice',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
