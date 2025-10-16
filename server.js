require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// ミドルウェアの設定
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静的ファイルの提供
app.use(express.static('public'));

// データベース接続設定
const connectWithRetry = async (retryCount = 0) => {
  const maxRetries = parseInt(process.env.MAX_RETRY_COUNT) || 5;
  const retryDelay = parseInt(process.env.RETRY_DELAY_MS) || 1000;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDBに接続しました');
  } catch (err) {
    console.error(`❌ MongoDB接続エラー (試行 ${retryCount + 1}/${maxRetries}):`, err.message);
    
    if (retryCount < maxRetries - 1) {
      console.log(`⏳ ${retryDelay}ms後に再接続を試みます...`);
      setTimeout(() => connectWithRetry(retryCount + 1), retryDelay);
    } else {
      console.log('⚠️ MongoDBが起動していないため、アプリケーションはデータベースなしで動作します');
    }
  }
};

// データベース接続開始
connectWithRetry();

// データベース接続イベントの監視
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDBから切断されました');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB接続エラー:', err);
});

// ルートのインポート
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const commentRoutes = require('./routes/comments');

// ルートの設定
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);

// 基本ルート
app.get('/', (req, res) => {
  res.json({
    message: 'ブログシステムAPIへようこそ',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  };
  
  const statusCode = mongoose.connection.readyState === 1 ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

// サーバー状態エンドポイント
app.get('/status', (req, res) => {
  res.json({
    server: 'running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'サーバーエラーが発生しました' });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({ message: 'ルートが見つかりません' });
});

const PORT = process.env.PORT || 3000;

// グレースフルシャットダウンの設定
const server = app.listen(PORT, () => {
  console.log(`✅ サーバーがポート${PORT}で起動しました`);
  console.log(`📊 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 ヘルスチェック: http://localhost:${PORT}/health`);
});

// グレースフルシャットダウンの処理
const gracefulShutdown = (signal) => {
  console.log(`\n📡 ${signal}を受信しました。グレースフルシャットダウンを開始します...`);
  
  server.close(() => {
    console.log('✅ HTTPサーバーを閉じました');
    
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB接続を閉じました');
      console.log('👋 サーバーを正常に終了しました');
      process.exit(0);
    });
  });

  // 強制終了タイマー（30秒）
  setTimeout(() => {
    console.error('❌ 強制終了: グレースフルシャットダウンがタイムアウトしました');
    process.exit(1);
  }, 30000);
};

// シグナルハンドリング
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon用

// 未処理の例外と拒否のハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 未処理の例外:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否:', reason);
  process.exit(1);
});