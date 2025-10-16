const express = require('express');
const Article = require('../models/Article');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 記事一覧を取得（公開記事のみ）
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // データベース接続状態を確認
    const mongoose = require('mongoose');
    const dbConnectionState = mongoose.connection.readyState;
    
    if (dbConnectionState === 1) { // 1 = connected (データベース利用可能)
      // 通常のデータベース記事取得
      const query = { isPublished: true };

      // 管理者の場合は非公開記事も表示
      if (req.user && req.user.role === 'admin') {
        delete query.isPublished;
      }

      const articles = await Article.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username email');

      const total = await Article.countDocuments(query);

      return res.json({
        articles,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } else {
      // デモモードでの記事一覧取得
      const { getDemoArticles } = require('../utils/demoStorage');
      let demoArticles = await getDemoArticles();
      
      // デフォルトのデモ記事が存在しない場合は追加
      if (demoArticles.length === 0) {
        const defaultArticles = [
          {
            _id: '1',
            title: 'ブログシステムへようこそ',
            content: 'これはデモ用の記事です。MongoDBが起動していないため、ダミーデータを表示しています。',
            author: { username: '管理者', email: 'admin@example.com' },
            createdAt: new Date().toISOString(),
            viewCount: 0,
            isPublished: true
          },
          {
            _id: '2',
            title: '使い方ガイド',
            content: '1. ユーザー登録を行います\n2. ログインして記事を投稿します\n3. 他のユーザーの記事にコメントできます',
            author: { username: '管理者', email: 'admin@example.com' },
            createdAt: new Date().toISOString(),
            viewCount: 0,
            isPublished: true
          }
        ];
        
        const { addDemoArticle } = require('../utils/demoStorage');
        for (const article of defaultArticles) {
          await addDemoArticle(article);
        }
        demoArticles = defaultArticles;
      }
      
      // 公開記事のみをフィルタリング
      const publishedDemoArticles = demoArticles.filter(article => article.isPublished !== false);
      
      // デモ記事を日付順にソート（最新が先頭）
      const sortedDemoArticles = [...publishedDemoArticles].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      // ページネーション適用
      const startIndex = skip;
      const endIndex = skip + limit;
      const paginatedArticles = sortedDemoArticles.slice(startIndex, endIndex);
      
      return res.json({
        articles: paginatedArticles,
        pagination: {
          current: page,
          pages: Math.ceil(sortedDemoArticles.length / limit),
          total: sortedDemoArticles.length
        }
      });
    }
  } catch (error) {
    console.error('記事一覧取得エラー:', error);
    
    // データベースエラーの場合はダミーデータを返す
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError' || error.name === 'MongooseError') {
      const { getDemoArticles } = require('../utils/demoStorage');
      let demoArticles = await getDemoArticles();
      
      // デフォルトのデモ記事が存在しない場合は追加
      if (demoArticles.length === 0) {
        const defaultArticles = [
          {
            _id: '1',
            title: 'ブログシステムへようこそ',
            content: 'これはデモ用の記事です。MongoDBが起動していないため、ダミーデータを表示しています。',
            author: { username: '管理者', email: 'admin@example.com' },
            createdAt: new Date().toISOString(),
            viewCount: 0,
            isPublished: true
          },
          {
            _id: '2',
            title: '使い方ガイド',
            content: '1. ユーザー登録を行います\n2. ログインして記事を投稿します\n3. 他のユーザーの記事にコメントできます',
            author: { username: '管理者', email: 'admin@example.com' },
            createdAt: new Date().toISOString(),
            viewCount: 0,
            isPublished: true
          }
        ];
        
        const { addDemoArticle } = require('../utils/demoStorage');
        for (const article of defaultArticles) {
          await addDemoArticle(article);
        }
        demoArticles = defaultArticles;
      }
      
      // 公開記事のみをフィルタリング
      const publishedDemoArticles = demoArticles.filter(article => article.isPublished !== false);
      
      // デモ記事を日付順にソート（最新が先頭）
      const sortedDemoArticles = [...publishedDemoArticles].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      // ページネーション適用
      const startIndex = skip;
      const endIndex = skip + limit;
      const paginatedArticles = sortedDemoArticles.slice(startIndex, endIndex);
      
      return res.json({
        articles: paginatedArticles,
        pagination: {
          current: page,
          pages: Math.ceil(sortedDemoArticles.length / limit),
          total: sortedDemoArticles.length
        }
      });
    }
    
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 特定の記事を取得
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    // まずデモ記事のIDをチェック
    if (req.params.id.startsWith('demo_')) {
      // デモ記事の場合は永続的ストレージから取得
      const { findDemoArticleById } = require('../utils/demoStorage');
      const demoArticle = await findDemoArticleById(req.params.id);
      
      if (demoArticle) {
        return res.json({ article: demoArticle });
      } else {
        // 見つからない場合はデフォルトのデモ記事を返す
        const defaultDemoArticle = {
          _id: req.params.id,
          title: 'デモ記事',
          content: 'これはデモモードで作成された記事です。実際のデータベースを使用する場合はMongoDBを起動してください。',
          author: { username: 'デモユーザー', email: 'demo@example.com' },
          createdAt: new Date().toISOString(),
          viewCount: 0,
          isPublished: true
        };
        return res.json({ article: defaultDemoArticle });
      }
    }
    
    // まずダミーデータのIDをチェック
    if (req.params.id === '1' || req.params.id === '2') {
      let dummyArticle;
      if (req.params.id === '1') {
        dummyArticle = {
          _id: '1',
          title: 'ブログシステムへようこそ',
          content: 'これはデモ用の記事です。MongoDBが起動していないため、ダミーデータを表示しています。\n\nこのブログシステムは以下の機能を備えています：\n- ユーザー登録とログイン\n- 記事の投稿と編集\n- コメント機能\n- レスポンシブデザイン\n\n実際に使用するにはMongoDBを起動してください。',
          author: { username: '管理者', email: 'admin@example.com' },
          createdAt: new Date().toISOString(),
          viewCount: 0,
          isPublished: true
        };
      } else if (req.params.id === '2') {
        dummyArticle = {
          _id: '2',
          title: '使い方ガイド',
          content: '## 使い方ガイド\n\n### 1. ユーザー登録\n- トップページの「新規登録」ボタンをクリック\n- ユーザー名、メールアドレス、パスワードを入力\n\n### 2. ログイン\n- 登録したメールアドレスとパスワードでログイン\n\n### 3. 記事投稿\n- ログイン後、「記事を書く」ボタンが表示されます\n- タイトルと本文を入力して投稿\n\n### 4. コメント\n- 記事詳細ページでコメントを投稿できます',
          author: { username: '管理者', email: 'admin@example.com' },
          createdAt: new Date().toISOString(),
          viewCount: 0,
          isPublished: true
        };
      }
      return res.json({ article: dummyArticle });
    }

    const article = await Article.findById(req.params.id)
      .populate('author', 'username email');

    if (!article) {
      return res.status(404).json({ message: '記事が見つかりません' });
    }

    // 非公開記事の場合は管理者のみアクセス可能
    if (!article.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'この記事は非公開です' });
    }

    // ビューカウントを増加（ログインユーザー以外の場合）
    if (!req.user || req.user.id !== article.author._id.toString()) {
      await article.incrementViewCount();
    }

    res.json({ article });
  } catch (error) {
    console.error('記事取得エラー:', error);
    
    // データベースエラーの場合はダミーデータを返す
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError') {
      if (req.params.id === '1') {
        const dummyArticle = {
          _id: '1',
          title: 'ブログシステムへようこそ',
          content: 'これはデモ用の記事です。MongoDBが起動していないため、ダミーデータを表示しています。',
          author: { username: '管理者', email: 'admin@example.com' },
          createdAt: new Date().toISOString(),
          viewCount: 0,
          isPublished: true
        };
        return res.json({ article: dummyArticle });
      } else if (req.params.id === '2') {
        const dummyArticle = {
          _id: '2',
          title: '使い方ガイド',
          content: '1. ユーザー登録を行います\n2. ログインして記事を投稿します\n3. 他のユーザーの記事にコメントできます',
          author: { username: '管理者', email: 'admin@example.com' },
          createdAt: new Date().toISOString(),
          viewCount: 0,
          isPublished: true
        };
        return res.json({ article: dummyArticle });
      }
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: '無効な記事IDです' });
    }
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 新しい記事を作成
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, tags, isPublished = true, featuredImage } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'タイトルと本文は必須です' });
    }

    // データベース接続状態を確認
    const mongoose = require('mongoose');
    const dbConnectionState = mongoose.connection.readyState;
    
    if (dbConnectionState === 1 && !req.isDemoUser) { // 1 = connected (データベース利用可能) かつ デモユーザーでない
      // 通常のデータベース記事作成
      const article = new Article({
        title,
        content,
        tags: tags || [],
        isPublished,
        featuredImage: featuredImage || '',
        author: req.user._id
      });

      await article.save();
      await article.populate('author', 'username email');

      return res.status(201).json({
        message: '記事が作成されました',
        article
      });
    } else {
      // デモモードでの記事作成
      const { addDemoArticle } = require('../utils/demoStorage');
      
      const demoArticle = {
        _id: `demo_${Date.now()}`,
        title,
        content,
        tags: tags || [],
        isPublished,
        featuredImage: featuredImage || '',
        author: {
          _id: req.isDemoUser ? req.user.id.toString() : 'demo_author',
          username: req.user.username,
          email: req.user.email
        },
        createdAt: new Date().toISOString(),
        viewCount: 0
      };

      // 永続的ストレージに追加
      await addDemoArticle(demoArticle);

      return res.status(201).json({
        message: '記事が作成されました（デモモード）',
        article: demoArticle
      });
    }
  } catch (error) {
    console.error('記事作成エラー:', error);
    
    // データベースエラーの場合はデモ記事を作成
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError' || error.name === 'MongooseError') {
      const { addDemoArticle } = require('../utils/demoStorage');
      
      const demoArticle = {
        _id: `demo_${Date.now()}`,
        title: req.body.title,
        content: req.body.content,
        tags: req.body.tags || [],
        isPublished: req.body.isPublished !== false,
        featuredImage: req.body.featuredImage || '',
        author: {
          _id: req.isDemoUser ? req.user.id.toString() : 'demo_author',
          username: req.user.username,
          email: req.user.email
        },
        createdAt: new Date().toISOString(),
        viewCount: 0
      };

      // 永続的ストレージに追加
      await addDemoArticle(demoArticle);

      return res.status(201).json({
        message: '記事が作成されました（デモモード）',
        article: demoArticle
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 記事を更新
router.put('/:id', auth, async (req, res) => {
  try {
    // デモ記事のIDをチェック
    if (req.params.id.startsWith('demo_')) {
      // デモ記事の場合は永続的ストレージを更新
      const { updateDemoArticle } = require('../utils/demoStorage');
      
      const { title, content, tags, isPublished, featuredImage } = req.body;
      
      try {
        const updatedArticle = await updateDemoArticle(req.params.id, {
          title,
          content,
          tags: tags || [],
          isPublished: isPublished !== false,
          featuredImage: featuredImage || ''
        });
        
        return res.json({
          message: '記事が更新されました（デモモード）',
          article: updatedArticle
        });
      } catch (demoError) {
        return res.status(404).json({ message: '記事が見つかりません' });
      }
    }

    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: '記事が見つかりません' });
    }

    // 記事の所有者または管理者のみ更新可能
    if (article.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'この記事を編集する権限がありません' });
    }

    const { title, content, tags, isPublished, featuredImage } = req.body;

    // 更新可能なフィールドのみ更新
    if (title !== undefined) article.title = title;
    if (content !== undefined) article.content = content;
    if (tags !== undefined) article.tags = tags;
    if (isPublished !== undefined) article.isPublished = isPublished;
    if (featuredImage !== undefined) article.featuredImage = featuredImage;

    await article.save();
    await article.populate('author', 'username email');

    res.json({
      message: '記事が更新されました',
      article
    });
  } catch (error) {
    console.error('記事更新エラー:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: '無効な記事IDです' });
    }
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 記事を削除
router.delete('/:id', auth, async (req, res) => {
  try {
    // デモ記事のIDをチェック
    if (req.params.id.startsWith('demo_')) {
      // デモ記事の場合は永続的ストレージから削除
      const { deleteDemoArticle } = require('../utils/demoStorage');
      
      try {
        await deleteDemoArticle(req.params.id);
        return res.json({ message: '記事が削除されました（デモモード）' });
      } catch (demoError) {
        return res.status(404).json({ message: '記事が見つかりません' });
      }
    }

    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ message: '記事が見つかりません' });
    }

    // 記事の所有者または管理者のみ削除可能
    if (article.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'この記事を削除する権限がありません' });
    }

    await Article.findByIdAndDelete(req.params.id);

    res.json({ message: '記事が削除されました' });
  } catch (error) {
    console.error('記事削除エラー:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: '無効な記事IDです' });
    }
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 自分の記事一覧を取得
router.get('/user/my-articles', auth, async (req, res) => {
  try {
    // データベース接続状態を確認
    const mongoose = require('mongoose');
    const dbConnectionState = mongoose.connection.readyState;
    
    if (dbConnectionState === 1 && !req.isDemoUser) { // 1 = connected (データベース利用可能) かつ デモユーザーでない
      // 通常のデータベースから自分の記事を取得
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const articles = await Article.find({ author: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username email');

      const total = await Article.countDocuments({ author: req.user._id });

      return res.json({
        articles,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } else {
      // デモモードでの自分の記事取得
      const { getDemoArticles } = require('../utils/demoStorage');
      const allDemoArticles = await getDemoArticles();
      
      // 現在のユーザーが投稿した記事のみをフィルタリング
      const userArticles = allDemoArticles.filter(article =>
        article.author._id === (req.isDemoUser ? req.user.id.toString() : req.user._id.toString())
      );
      
      // ページネーション適用
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const sortedUserArticles = [...userArticles].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      const startIndex = skip;
      const endIndex = skip + limit;
      const paginatedArticles = sortedUserArticles.slice(startIndex, endIndex);
      
      return res.json({
        articles: paginatedArticles,
        pagination: {
          current: page,
          pages: Math.ceil(sortedUserArticles.length / limit),
          total: sortedUserArticles.length
        }
      });
    }
  } catch (error) {
    console.error('自分の記事一覧取得エラー:', error);
    
    // データベースエラーの場合はデモモードで処理
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError' || error.name === 'MongooseError') {
      const { getDemoArticles } = require('../utils/demoStorage');
      const allDemoArticles = await getDemoArticles();
      
      // 現在のユーザーが投稿した記事のみをフィルタリング
      const userArticles = allDemoArticles.filter(article =>
        article.author._id === (req.isDemoUser ? req.user.id.toString() : req.user._id.toString())
      );
      
      // ページネーション適用
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const sortedUserArticles = [...userArticles].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      const startIndex = skip;
      const endIndex = skip + limit;
      const paginatedArticles = sortedUserArticles.slice(startIndex, endIndex);
      
      return res.json({
        articles: paginatedArticles,
        pagination: {
          current: page,
          pages: Math.ceil(sortedUserArticles.length / limit),
          total: sortedUserArticles.length
        }
      });
    }
    
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;