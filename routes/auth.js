const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ユーザー登録
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 入力バリデーション
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'すべてのフィールドを入力してください' });
    }

    // データベース接続状態を確認
    const dbConnectionState = mongoose.connection.readyState;
    
    if (dbConnectionState === 1) { // 1 = connected (データベース利用可能)
      // 通常のデータベース登録
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          message: 'このメールアドレスまたはユーザー名は既に使用されています'
        });
      }

      const user = new User({
        username,
        email,
        password
      });

      await user.save();

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'ユーザー登録が完了しました',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } else {
      // デモモードでの登録
      const { registerDemoUser, generateDemoToken } = require('../utils/demoAuth');
      
      try {
        const user = await registerDemoUser(username, email, password);
        const token = generateDemoToken(user);

        return res.status(201).json({
          message: 'ユーザー登録が完了しました（デモモード）',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      } catch (demoError) {
        return res.status(400).json({
          message: demoError.message
        });
      }
    }
  } catch (error) {
    console.error('登録エラー:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ログイン
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 入力バリデーション
    if (!email || !password) {
      return res.status(400).json({ message: 'メールアドレスとパスワードを入力してください' });
    }

    // データベース接続状態を確認
    const dbConnectionState = mongoose.connection.readyState;
    
    if (dbConnectionState === 1) { // 1 = connected (データベース利用可能)
      // 通常のデータベースログイン
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
      }

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'ログインに成功しました',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } else {
      // デモモードでのログイン
      const { loginDemoUser, generateDemoToken } = require('../utils/demoAuth');
      
      try {
        const user = await loginDemoUser(email, password);
        const token = generateDemoToken(user);

        return res.json({
          message: 'ログインに成功しました（デモモード）',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      } catch (demoError) {
        return res.status(401).json({
          message: demoError.message
        });
      }
    }
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// 現在のユーザー情報を取得
router.get('/me', auth, async (req, res) => {
  try {
    let userData;
    
    if (req.isDemoUser) {
      // デモユーザーの場合
      userData = {
        id: req.user.id.toString(), // 文字列に変換
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      };
    } else {
      // 通常ユーザーの場合
      userData = {
        id: req.user._id.toString(), // 文字列に変換
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      };
    }

    res.json({
      user: userData
    });
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;