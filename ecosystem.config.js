module.exports = {
  apps: [{
    name: 'blog-server',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 監視設定
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    
    // ログ設定
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 再起動設定
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // ヘルスチェック
    health_check_url: 'http://localhost:3000/health',
    health_check_grace_period: 3000
  }]
};