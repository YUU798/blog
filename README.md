# ブログシステム（Flask版）

このプロジェクトは、Flaskを使用した動的なブログシステムです。ユーザー認証、記事の作成・編集・削除、コメント機能を備えた完全なブログプラットフォームです。

## 🌟 主な機能

### 👥 ユーザー管理
- **新規ユーザー登録** - ユーザー名、メールアドレス、パスワードで登録
- **ログイン/ログアウト** - セキュアな認証システム
- **ユーザーセッション管理** - ログイン状態の維持

### 📝 記事管理
- **記事の作成** - リッチテキストでの記事作成
- **記事の編集・更新** - 作成者による記事の編集
- **記事の削除** - 作成者による記事の削除
- **公開/非公開設定** - 記事の公開状態の制御
- **記事一覧表示** - 公開記事の一覧表示
- **記事詳細表示** - 個別記事の詳細表示

### 💬 コメント機能
- **コメント投稿** - ログインユーザーによるコメント投稿
- **返信機能** - コメントに対する返信（スレッド形式）
- **リアルタイム表示** - 投稿後の即時表示

### 🎨 デザイン機能
- **レスポンシブデザイン** - スマートフォン、タブレット、PC対応
- **モダンUI** - 美しいインターフェース
- **スクロール最適化** - メニューバーとの干渉防止

## 🚀 クイックスタート

### 方法1: 簡単起動（推奨）

```bash
# 起動スクリプトを実行
./start_production.sh
```

### 方法2: 手動起動

```bash
# 依存関係のインストール
pip install -r requirements.txt

# アプリケーションの起動
python3 app.py
```

### 方法3: Dockerを使用

```bash
# 開発環境（ポート5002）
docker-compose up web-dev

# 本番環境（ポート5000）
docker-compose up web
```

## 📡 アクセス方法

### ローカルアクセス
```
http://localhost:5002
```

### ネットワークアクセス（他のデバイスから）
```
http://[サーバーのIPアドレス]:5002
```

**例**: サーバーIPが `192.168.1.100` の場合
```
http://192.168.1.100:5002
```

## 🛠️ 技術スタック

### バックエンド
- **Flask 2.3.3** - Python Webフレームワーク
- **SQLAlchemy** - ORM（オブジェクト関係マッピング）
- **Flask-Login** - ユーザー認証管理
- **Werkzeug** - パスワードハッシュ化

### データベース
- **SQLite** - 軽量データベース
- 自動マイグレーション対応

### フロントエンド
- **HTML5** - セマンティックマークアップ
- **CSS3** - モダンなスタイリング
- **Jinja2** - テンプレートエンジン

## 📁 プロジェクト構造

```
.
├── app.py                 # メインアプリケーション
├── requirements.txt       # Python依存関係
├── wsgi.py               # WSGIエントリーポイント
├── Dockerfile            # Docker設定
├── docker-compose.yml    # Docker Compose設定
├── start_production.sh   # 本番環境起動スクリプト
├── DEPLOYMENT.md         # 詳細なデプロイメントガイド
├── .env                  # 環境変数設定
├── instance/
│   └── blog.db          # データベースファイル（自動生成）
├── static/
│   └── css/
│       └── style.css    # スタイルシート
└── templates/           # テンプレートファイル
    ├── base.html        # ベースレイアウト
    ├── index.html       # トップページ
    ├── login.html       # ログインページ
    ├── register.html    # 新規登録ページ
    ├── article_detail.html # 記事詳細ページ
    ├── create_article.html # 記事作成ページ
    ├── edit_article.html   # 記事編集ページ
    ├── my_articles.html  # 自分の記事一覧
    └── reply_item.html   # 返信アイテムテンプレート
```

## 🔧 詳細な使用方法

### 1. 初回セットアップ
```bash
# 仮想環境の作成（推奨）
python3 -m venv venv
source venv/bin/activate

# 依存関係のインストール
pip install -r requirements.txt
```

### 2. 開発環境での実行
```bash
# 開発モードで起動（自動リロード有効）
FLASK_DEBUG=1 python3 app.py
```

### 3. 本番環境での実行
```bash
# 本番モードで起動
FLASK_DEBUG=0 python3 app.py
```

## 🌐 デプロイオプション

### ローカルネットワーク公開
```bash
# ネットワーク全体からアクセス可能
HOST=0.0.0.0 PORT=5000 python3 app.py
```

### Dockerデプロイ
```bash
# イメージビルド
docker build -t blog-system .

# コンテナ実行
docker run -d -p 5000:5000 --name blog-app blog-system
```

### 本番環境（Gunicorn + Nginx）
詳細は [`DEPLOYMENT.md`](DEPLOYMENT.md) を参照してください。

## 🔒 セキュリティ機能

- パスワードのハッシュ化保存
- セッションベースの認証
- CSRF保護
- SQLインジェクション対策
- 権限に基づいたアクセス制御

## 📊 データベースモデル

### User（ユーザー）
- `id` - 主キー
- `username` - ユーザー名（一意）
- `email` - メールアドレス（一意）
- `password_hash` - ハッシュ化されたパスワード
- `created_at` - アカウント作成日時

### Article（記事）
- `id` - 主キー
- `title` - 記事タイトル
- `content` - 記事本文
- `author_id` - 著者ID（外部キー）
- `is_published` - 公開フラグ
- `created_at` - 作成日時
- `updated_at` - 最終更新日時

### Comment（コメント）
- `id` - 主キー
- `content` - コメント本文
- `author_id` - 投稿者ID（外部キー）
- `article_id` - 記事ID（外部キー）
- `created_at` - 投稿日時

### Reply（返信）
- `id` - 主キー
- `content` - 返信本文
- `author_id` - 投稿者ID（外部キー）
- `comment_id` - コメントID（外部キー）
- `parent_reply_id` - 親返信ID（スレッド対応）
- `created_at` - 投稿日時

## 🐛 トラブルシューティング

### ポートが使用中の場合
```bash
# 別のポートで起動
PORT=5002 python3 app.py
```

### データベースエラーの場合
```bash
# データベースファイルを再作成
rm instance/blog.db
python3 app.py
```

### 依存関係エラーの場合
```bash
# 依存関係を再インストール
pip install --upgrade -r requirements.txt
```

## 📄 ライセンス

MIT License

## 🤝 貢献

バグレポートや機能リクエストはIssueで受け付けています。

---

**開発者**: ブログシステム開発チーム  
**バージョン**: 1.0.0  
**最終更新**: 2024年
