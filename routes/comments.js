const express = require('express');
const Comment = require('../models/Comment');
const Article = require('../models/Article');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 記事に対するコメント一覧を取得
router.get('/article/:articleId', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // まずダミーデータの記事IDをチェック
    if (req.params.articleId === '1' || req.params.articleId === '2') {
      let allComments = [
        {
          _id: '1',
          content: '素晴らしいブログシステムですね！使いやすそうです。',
          author: { username: 'テストユーザー', email: 'test@example.com' },
          createdAt: new Date().toISOString(),
          isApproved: true
        },
        {
          _id: '2',
          content: 'コメント機能も完備されていて便利です。',
          author: { username: 'ゲスト', email: 'guest@example.com' },
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1日前
          isApproved: true
        }
      ];
      
      // グローバルデモコメントを追加
      if (global.demoComments && global.demoComments.length > 0) {
        const articleDemoComments = global.demoComments.filter(comment =>
          comment.article === req.params.articleId && !comment.parentComment
        );
        allComments = [...articleDemoComments, ...allComments];
      }
      
      return res.json({
        comments: allComments,
        pagination: {
          current: 1,
          pages: 1,
          total: allComments.length
        }
      });
    }

    // デモ記事のIDをチェック
    if (req.params.articleId.startsWith('demo_')) {
      // デモ記事の場合はダミーコメントとグローバルデモコメントを返す
      let allComments = [
        {
          _id: 'demo_comment_1',
          content: 'このデモ記事にコメントを投稿できます。',
          author: { username: 'デモユーザー', email: 'demo@example.com' },
          createdAt: new Date().toISOString(),
          isApproved: true
        }
      ];
      
      // グローバルデモコメントを追加
      if (global.demoComments && global.demoComments.length > 0) {
        const articleDemoComments = global.demoComments.filter(comment =>
          comment.article === req.params.articleId && !comment.parentComment
        );
        allComments = [...articleDemoComments, ...allComments];
      }
      
      return res.json({
        comments: allComments,
        pagination: {
          current: 1,
          pages: 1,
          total: allComments.length
        }
      });
    }

    // 記事が存在するか確認
    const article = await Article.findById(req.params.articleId);
    if (!article) {
      return res.status(404).json({ message: '記事が見つかりません' });
    }

    // 非公開記事の場合は管理者のみアクセス可能
    if (!article.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'この記事は非公開です' });
    }

    const comments = await Comment.find({
      article: req.params.articleId,
      parentComment: null, // 親コメントのみ取得
      isApproved: true
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username email')
    .populate({
      path: 'replies',
      match: { isApproved: true },
      populate: { path: 'author', select: 'username email' }
    });

    const total = await Comment.countDocuments({
      article: req.params.articleId,
      parentComment: null,
      isApproved: true
    });

    res.json({
      comments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('コメント一覧取得エラー:', error);
    
    // データベースエラーの場合はダミーデータを返す
    if ((error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError') &&
        (req.params.articleId === '1' || req.params.articleId === '2')) {
      let allComments = [
        {
          _id: '1',
          content: '素晴らしいブログシステムですね！使いやすそうです。',
          author: { username: 'テストユーザー', email: 'test@example.com' },
          createdAt: new Date().toISOString(),
          isApproved: true
        },
        {
          _id: '2',
          content: 'コメント機能も完備されていて便利です。',
          author: { username: 'ゲスト', email: 'guest@example.com' },
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1日前
          isApproved: true
        }
      ];
      
      // グローバルデモコメントを追加
      if (global.demoComments && global.demoComments.length > 0) {
        const articleDemoComments = global.demoComments.filter(comment =>
          comment.article === req.params.articleId && !comment.parentComment
        );
        allComments = [...articleDemoComments, ...allComments];
      }
      
      return res.json({
        comments: allComments,
        pagination: {
          current: 1,
          pages: 1,
          total: allComments.length
        }
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: '無効な記事IDです' });
    }
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 新しいコメントを作成
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { content, articleId, parentCommentId } = req.body;

    if (!content || !articleId) {
      return res.status(400).json({ message: 'コメント内容と記事IDは必須です' });
    }

    // デモ記事のIDをチェック（最初に処理）
    if (articleId.startsWith('demo_') || articleId === '1' || articleId === '2') {
      // デモ記事の場合はコメント作成を許可（デモモード）
      const demoComment = {
        _id: `demo_comment_${Date.now()}`,
        content,
        article: articleId,
        parentComment: parentCommentId || null,
        author: {
          _id: req.isDemoUser ? req.user.id.toString() : req.user._id.toString(),
          username: req.user.username,
          email: req.user.email
        },
        createdAt: new Date().toISOString(),
        isApproved: true
      };

      // デモコメントをグローバル配列に保存（実際のアプリではデータベースを使用）
      if (!global.demoComments) {
        global.demoComments = [];
      }
      global.demoComments.push(demoComment);

      return res.status(201).json({
        message: 'コメントが投稿されました（デモ記事）',
        comment: demoComment
      });
    }

    // 通常の記事の場合のみ記事存在チェック
    let article;
    try {
      article = await Article.findById(articleId);
      if (!article) {
        return res.status(404).json({ message: '記事が見つかりません' });
      }

      // 非公開記事の場合は管理者のみコメント可能
      if (!article.isPublished && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'この記事は非公開です' });
      }
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ message: '無効な記事IDです' });
      }
      throw error;
    }

    // 親コメントが指定されている場合は存在確認（デモコメントIDの場合はスキップ）
    if (parentCommentId) {
      if (!parentCommentId.startsWith('demo_comment_')) {
        const parentComment = await Comment.findById(parentCommentId);
        if (!parentComment) {
          return res.status(404).json({ message: '親コメントが見つかりません' });
        }
      }
    }

    // 匿名ユーザーの場合、デモユーザーとして扱う
    let authorId;
    let authorInfo;
    
    if (req.user) {
      authorId = req.user._id;
      authorInfo = {
        _id: req.user._id.toString(),
        username: req.user.username,
        email: req.user.email
      };
    } else {
      // 匿名ユーザーの場合、デモユーザーを作成
      authorId = new mongoose.Types.ObjectId();
      authorInfo = {
        _id: authorId.toString(),
        username: '匿名ユーザー',
        email: 'anonymous@example.com'
      };
    }

    const comment = new Comment({
      content,
      article: articleId,
      parentComment: parentCommentId || null,
      author: authorId
    });

    await comment.save();
    await comment.populate('author', 'username email');

    // 匿名ユーザーの場合はデモユーザー情報を追加
    const commentResponse = comment.toObject();
    if (!req.user) {
      commentResponse.author = authorInfo;
    }

    res.status(201).json({
      message: 'コメントが投稿されました',
      comment: commentResponse
    });
  } catch (error) {
    console.error('コメント作成エラー:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// コメントを更新
router.put('/:id', auth, async (req, res) => {
  try {
    // デモコメントのIDをチェック
    if (req.params.id.startsWith('demo_comment_')) {
      // デモコメントの更新処理
      if (!global.demoComments) {
        return res.status(404).json({ message: 'コメントが見つかりません' });
      }
      
      const commentIndex = global.demoComments.findIndex(comment => comment._id === req.params.id);
      if (commentIndex === -1) {
        return res.status(404).json({ message: 'コメントが見つかりません' });
      }
      
      // コメントの所有者または管理者のみ更新可能
      const comment = global.demoComments[commentIndex];
      const userId = req.isDemoUser ? req.user.id.toString() : req.user._id.toString();
      if (comment.author._id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'このコメントを編集する権限がありません' });
      }
      
      const { content } = req.body;
      
      if (content !== undefined) {
        global.demoComments[commentIndex].content = content;
        global.demoComments[commentIndex].updatedAt = new Date().toISOString();
      }
      
      return res.json({
        message: 'コメントが更新されました',
        comment: global.demoComments[commentIndex]
      });
    }

    const comment = await Comment.findById(req.params.id).populate('author', 'username email');

    if (!comment) {
        return res.status(404).json({ message: 'コメントが見つかりません' });
    }

    // 匿名ユーザーのコメントは編集不可
    if (comment.author.username === '匿名ユーザー') {
        return res.status(403).json({ message: '匿名ユーザーのコメントは編集できません' });
    }

    // コメントの所有者または管理者のみ更新可能
    if (comment.author._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'このコメントを編集する権限がありません' });
    }

    const { content } = req.body;

    if (content !== undefined) {
      comment.content = content;
    }

    await comment.save();
    await comment.populate('author', 'username email');

    res.json({
      message: 'コメントが更新されました',
      comment
    });
  } catch (error) {
    console.error('コメント更新エラー:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.name === 'CastError') {
      // 無効なコメントIDの場合でも、デモコメントの可能性があるので確認
      if (req.params.id.startsWith('demo_comment_')) {
        return res.status(404).json({ message: 'デモコメントが見つかりません' });
      }
      return res.status(400).json({ message: '無効なコメントIDです' });
    }
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// コメントを削除
router.delete('/:id', auth, async (req, res) => {
  try {
    // デモコメントのIDをチェック
    if (req.params.id.startsWith('demo_comment_')) {
      // デモコメントの削除処理
      if (!global.demoComments) {
        global.demoComments = [];
        return res.status(404).json({ message: 'コメントが見つかりません' });
      }
      
      const commentIndex = global.demoComments.findIndex(comment => comment._id === req.params.id);
      if (commentIndex === -1) {
        return res.status(404).json({ message: 'コメントが見つかりません' });
      }
      
      // コメントの所有者または管理者のみ削除可能
      const comment = global.demoComments[commentIndex];
      const userId = req.isDemoUser ? req.user.id.toString() : req.user._id.toString();
      if (comment.author._id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'このコメントを削除する権限がありません' });
      }
      
      // デモコメントを削除
      global.demoComments.splice(commentIndex, 1);
      
      return res.json({ message: 'コメントが削除されました' });
    }

    // 通常のコメント削除処理
    const comment = await Comment.findById(req.params.id).populate('author', 'username email');

    if (!comment) {
        return res.status(404).json({ message: 'コメントが見つかりません' });
    }

    // 匿名ユーザーのコメントは削除不可
    if (comment.author.username === '匿名ユーザー') {
        return res.status(403).json({ message: '匿名ユーザーのコメントは削除できません' });
    }

    // コメントの所有者または管理者のみ削除可能
    if (comment.author._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'このコメントを削除する権限がありません' });
    }

    // 返信コメントも削除
    await Comment.deleteMany({ parentComment: req.params.id });
    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: 'コメントが削除されました' });
  } catch (error) {
    console.error('コメント削除エラー:', error);
    if (error.name === 'CastError') {
      // 無効なコメントIDの場合でも、デモコメントの可能性があるので確認
      if (req.params.id.startsWith('demo_comment_')) {
        // デモコメントが見つからない場合
        return res.status(404).json({ message: 'デモコメントが見つかりません' });
      }
      return res.status(400).json({ message: '無効なコメントIDです' });
    }
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 管理者用：コメントの承認/非承認
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '管理者権限が必要です' });
    }

    // デモコメントのIDをチェック
    if (req.params.id.startsWith('demo_comment_')) {
      // デモコメントの承認処理
      if (!global.demoComments) {
        return res.status(404).json({ message: 'コメントが見つかりません' });
      }
      
      const commentIndex = global.demoComments.findIndex(comment => comment._id === req.params.id);
      if (commentIndex === -1) {
        return res.status(404).json({ message: 'コメントが見つかりません' });
      }
      
      // デモコメントの承認状態を切り替え
      global.demoComments[commentIndex].isApproved = !global.demoComments[commentIndex].isApproved;
      
      return res.json({
        message: `コメントが${global.demoComments[commentIndex].isApproved ? '承認' : '非承認'}されました`,
        comment: global.demoComments[commentIndex]
      });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'コメントが見つかりません' });
    }

    comment.isApproved = !comment.isApproved;
    await comment.save();

    res.json({
      message: `コメントが${comment.isApproved ? '承認' : '非承認'}されました`,
      comment
    });
  } catch (error) {
    console.error('コメント承認エラー:', error);
    if (error.name === 'CastError') {
      // 無効なコメントIDの場合でも、デモコメントの可能性があるので確認
      if (req.params.id.startsWith('demo_comment_')) {
        return res.status(404).json({ message: 'デモコメントが見つかりません' });
      }
      return res.status(400).json({ message: '無効なコメントIDです' });
    }
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;