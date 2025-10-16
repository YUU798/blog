# ブログシステム

Node.js + Express + MongoDB を使用したシンプルなブログシステムです。ユーザー登録、ログイン、記事投稿、編集、コメント機能を備えています。

## 機能

- ✅ ユーザー登録
- ✅ ログイン
- ✅ 記事投稿
- ✅ 記事編集
- ✅ 記事一覧表示
- ✅ コメント投稿
- ✅ レスポンシブデザイン
- ✅ URLルーティング（GitHubスタイルの個別記事ページ）

## 技術スタック

- **バックエンド**: Node.js, Express.js
- **データベース**: MongoDB with Mongoose
- **認証**: JWT (JSON Web Tokens)
- **フロントエンド**: 純粋なHTML/CSS/JavaScript
- **パスワードハッシュ**: bcryptjs

## インストールとセットアップ

### 前提条件

- Node.js (v14以上)
- MongoDB (ローカルまたはMongoDB Atlas)

### インストール手順

1. リポジトリをクローン
```bash
git clone <repository-url>
cd blog
```

2. 依存パッケージをインストール
```bash
npm install
```

3. 環境変数の設定
`.env` ファイルを編集して、実際の設定値を入力してください：
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/blog_system
JWT_SECRET=your_secure_jwt_secret_key_here
NODE_ENV=development
```

4. MongoDBの起動
ローカルのMongoDBを使用する場合：
```bash
# macOS (Homebrewを使用している場合)
brew services start mongodb-community

# または直接起動
mongod
```

5. アプリケーションの起動
```bash
# 開発モード
npm run dev

# または本番モード
npm start
```

6. ブラウザでアクセス
```
http://localhost:3000
```

## APIエンドポイント

### 認証関連

- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 現在のユーザー情報取得

### 記事関連

- `GET /api/articles` - 記事一覧取得
- `GET /api/articles/:id` - 特定の記事取得
- `POST /api/articles` - 記事作成（認証必要）
- `PUT /api/articles/:id` - 記事更新（認証必要）
- `DELETE /api/articles/:id` - 記事削除（認証必要）

### コメント関連

- `GET /api/comments/article/:articleId` - 記事のコメント一覧
- `POST /api/comments` - コメント投稿（認証必要）
- `PUT /api/comments/:id` - コメント更新（認証必要）
- `DELETE /api/comments/:id` - コメント削除（認証必要）

## プロジェクト構造

```
blog/
├── models/                 # データベースモデル
│   ├── User.js           # ユーザーモデル
│   ├── Article.js        # 記事モデル
│   └── Comment.js        # コメントモデル
├── routes/               # APIルート
│   ├── auth.js          # 認証ルート
│   ├── articles.js      # 記事ルート
│   └── comments.js      # コメントルート
├── middleware/           # ミドルウェア
│   └── auth.js          # 認証ミドルウェア
├── public/              # フロントエンドファイル
│   ├── index.html       # メインページ
│   └── app.js          # フロントエンドJavaScript
├── server.js           # メインサーバーファイル
├── package.json        # プロジェクト設定
├── .env               # 環境変数
└── README.md          # プロジェクト説明
```

## 使用方法

### ユーザー登録

1. トップページの「新規登録」ボタンをクリック
2. ユーザー名、メールアドレス、パスワードを入力
3. 登録ボタンをクリック

### ログイン

1. トップページの「ログイン」ボタンをクリック
2. メールアドレスとパスワードを入力
3. ログインボタンをクリック

### 記事の投稿

1. ログイン後、「記事を書く」ボタンが表示されます
2. 記事タイトルと本文を入力
3. 投稿ボタンをクリック

### コメントの投稿

1. 記事詳細ページでコメントフォームを表示
2. コメント内容を入力
3. 投稿ボタンをクリック

## 開発者向け情報

### データベーススキーマ

#### ユーザー (User)
- `username` - ユーザー名（一意）
- `email` - メールアドレス（一意）
- `password` - ハッシュ化されたパスワード
- `role` - ユーザーロール（user/admin）

#### 記事 (Article)
- `title` - 記事タイトル
- `content` - 記事本文
- `author` - 著者（User参照）
- `tags` - タグ配列
- `isPublished` - 公開状態
- `viewCount` - 閲覧数

#### コメント (Comment)
- `content` - コメント内容
- `author` - 投稿者（User参照）
- `article` - 対象記事（Article参照）
- `parentComment` - 親コメント（返信の場合）

### セキュリティ機能

- パスワードのbcryptによるハッシュ化
- JWTトークンによる認証
- 入力バリデーション
- CORS設定
- 環境変数による設定管理

## 今後の拡張予定

- [ ] 記事検索機能
- [ ] タグ管理
- [ ] 画像アップロード
- [ ] 管理者ダッシュボード
- [ ] メール通知
- [ ] ソーシャルログイン
- [ ] 記事のお気に入り機能

## トラブルシューティング

### MongoDB接続エラー
- MongoDBが起動しているか確認
- `.env`ファイルのMONGODB_URIが正しいか確認

### ポートが使用中
- 別のポート番号を指定するか、使用中のプロセスを終了

### 依存パッケージのエラー
- `node_modules`フォルダを削除して再インストール
```bash
rm -rf node_modules
npm install
```

## ライセンス

MIT License