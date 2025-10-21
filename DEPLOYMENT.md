# ブログシステム デプロイメントガイド

このガイドでは、ブログシステムを本番環境で実行する方法について説明します。

## 前提条件

- Python 3.8以上
- pip (Pythonパッケージマネージャー)

## 方法1: 直接実行

### 1. 依存関係のインストール
```bash
pip install -r requirements.txt
```

### 2. 環境変数の設定
`.env`ファイルを編集して、本番環境用の設定に変更します：
```bash
# 強力なシークレットキーを設定
SECRET_KEY=your-very-secure-production-secret-key

# 本番環境設定
FLASK_ENV=production
FLASK_DEBUG=0

# 外部アクセスを許可
HOST=0.0.0.0
PORT=5000
```

### 3. アプリケーションの起動
```bash
python app.py
```

アプリケーションは `http://0.0.0.0:5000` で実行され、ネットワーク上の他のデバイスからアクセス可能になります。

## 方法2: Dockerを使用

### 1. Dockerイメージのビルド
```bash
docker build -t blog-system .
```

### 2. コンテナの実行
```bash
docker run -d -p 5000:5000 --name blog-app blog-system
```

### 3. Docker Composeを使用（推奨）
```bash
docker-compose up -d
```

## 方法3: 本番環境用WSGIサーバー

### Gunicornを使用（推奨）
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
```

### システムサービスとして実行
`/etc/systemd/system/blog-system.service` ファイルを作成：
```ini
[Unit]
Description=Blog System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/blog-system
Environment=PATH=/path/to/your/venv/bin
ExecStart=/path/to/your/venv/bin/gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
Restart=always

[Install]
WantedBy=multi-user.target
```

サービスを有効化：
```bash
sudo systemctl daemon-reload
sudo systemctl enable blog-system
sudo systemctl start blog-system
```

## ネットワーク設定

### ファイアウォール設定
```bash
# UFWを使用する場合
sudo ufw allow 5000
```

### リバースプロキシ設定（Nginx）
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /path/to/your/blog-system/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## セキュリティ設定

### 1. 強力なシークレットキーの生成
```python
import secrets
print(secrets.token_hex(32))
```

### 2. データベースのバックアップ
```bash
# SQLiteデータベースのバックアップ
cp instance/blog.db instance/blog.db.backup.$(date +%Y%m%d)
```

### 3. 定期的なアップデート
```bash
pip install --upgrade -r requirements.txt
```

## トラブルシューティング

### アプリケーションが起動しない場合
1. ポートが使用中でないか確認：`netstat -tulpn | grep 5000`
2. ファイアウォール設定を確認
3. ログを確認：`docker logs blog-app` または `journalctl -u blog-system`

### 静的ファイルが表示されない場合
1. 静的ファイルディレクトリのパーミッションを確認
2. Nginx設定の静的ファイルパスを確認

## パフォーマンス最適化

### 1. 静的ファイルのキャッシュ
```nginx
location /static {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Gunicornワーカーの調整
```bash
# CPUコア数に基づいてワーカー数を設定
gunicorn -w $(nproc) -b 0.0.0.0:5000 wsgi:app
```

## 監視とログ

### ログの確認
```bash
# Dockerの場合
docker logs -f blog-app

# システムサービスの場合
journalctl -u blog-system -f
```

この設定により、Safari、Chrome、その他のブラウザからネットワーク上の任意のデバイスからブログシステムにアクセスできるようになります。