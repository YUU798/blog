FROM python:3.9-slim

WORKDIR /app

# システム依存関係のインストール
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係のコピーとインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY . .

# データベースディレクトリの作成
RUN mkdir -p instance

# ポートの公開
EXPOSE 5000

# 環境変数の設定
ENV FLASK_ENV=production
ENV FLASK_DEBUG=0

# アプリケーションの起動
CMD ["python", "app.py"]