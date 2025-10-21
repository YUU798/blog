#!/bin/bash

# ブログシステム 本番環境起動スクリプト
echo "ブログシステム 本番環境を起動します..."

# 環境変数の確認
if [ ! -f ".env" ]; then
    echo "警告: .envファイルが見つかりません。デフォルト設定を使用します。"
    echo "本番環境では必ず適切な.envファイルを作成してください。"
fi

# 依存関係の確認
if [ ! -d "instance" ]; then
    echo "データベースディレクトリを作成します..."
    mkdir -p instance
fi

# Python仮想環境の確認
if [ ! -d "venv" ]; then
    echo "Python仮想環境を作成します..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# データベースの初期化
echo "データベースを初期化します..."
python -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('データベースの初期化が完了しました')
"

# アプリケーションの起動
echo "アプリケーションを起動します..."
echo "アクセスURL: http://0.0.0.0:5000"
echo "ネットワーク上の他のデバイスからもアクセス可能です"
echo "停止するには Ctrl+C を押してください"

# 本番環境で起動
python app.py