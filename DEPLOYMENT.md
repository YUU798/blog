# サーバーデプロイガイド

## サーバー常時接続設定

このガイドでは、ブログサーバーを常時接続可能な状態で運用するための設定方法を説明します。

## 1. 環境設定

### 環境変数の設定
`.env`ファイルを本番環境に合わせて編集してください：

```bash
# サーバー設定
PORT=3000
NODE_ENV=production

# データベース設定（本番環境用）
MONGODB_URI=mongodb://your-production-db:27017/blog

# JWT設定（本番環境では必ず変更）
JWT_SECRET=your_secure_jwt_secret_key_production

# サーバー安定性設定
MAX_RETRY_COUNT=10
RETRY_DELAY_MS=2000
```

## 2. プロセス管理 (PM2)

### PM2のインストール
```bash
npm install -g pm2
```

### アプリケーションの起動
```bash
# 開発環境
npm run pm2:start

# 本番環境
NODE_ENV=production npm run pm2:start
```

### PM2コマンド
```bash
# ステータス確認
npm run pm2:monitor

# ログ確認
npm run pm2:logs

# 再起動
npm run pm2:restart

# 停止
npm run pm2:stop
```

## 3. システム起動時自動起動

### PM2をシステムサービスとして設定
```bash
# 起動スクリプトを生成
pm2 startup

# 現在のプロセスを保存
pm2 save
```

## 4. ヘルスチェックと監視

### ヘルスチェックエンドポイント
- `GET /health` - 詳細なヘルスステータス
- `GET /status` - 簡易ステータス
- `GET /` - 基本情報

### 手動でのヘルスチェック
```bash
npm run health:check
```

## 5. トラブルシューティング

### サーバーが起動しない場合
1. ポートが使用中でないか確認
2. データベース接続を確認
3. ログを確認: `npm run pm2:logs`

### データベース接続エラー
- MongoDBが起動しているか確認
- 接続文字列が正しいか確認
- ネットワーク接続を確認

### メモリ不足
- PM2が自動的に再起動します
- `max_memory_restart`設定を調整可能

## 6. バックアップと復旧

### データベースバックアップ
定期的にMongoDBのバックアップを実施してください。

### 設定ファイルのバックアップ
- `.env`
- `ecosystem.config.js`
- `package.json`

## 7. セキュリティ設定

### 本番環境での注意点
1. JWTシークレットを強力な値に変更
2. データベース認証を有効化
3. ファイアウォール設定を確認
4. HTTPSの使用を推奨

## 8. パフォーマンス監視

### 監視対象指標
- メモリ使用量
- CPU使用率
- データベース接続状態
- レスポンスタイム

この設定により、サーバーは自動的に再起動し、常時接続可能な状態を維持します。