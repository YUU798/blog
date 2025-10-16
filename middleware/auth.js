const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyDemoToken } = require('../utils/demoAuth');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'アクセストークンが必要です' });
    }

    // まずデモユーザーをチェック
    const demoUser = await verifyDemoToken(token);
    if (demoUser) {
      req.user = demoUser;
      req.isDemoUser = true;
      return next();
    }

    // 通常のデータベースユーザーをチェック
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'ユーザーが見つかりません' });
    }

    req.user = user;
    req.isDemoUser = false;
    next();
  } catch (error) {
    console.error('認証エラー:', error);
    res.status(401).json({ message: 'トークンが無効です' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      // まずデモユーザーをチェック
      const demoUser = await verifyDemoToken(token);
      if (demoUser) {
        req.user = demoUser;
        req.isDemoUser = true;
      } else {
        // 通常のデータベースユーザーをチェック
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        req.user = user;
        req.isDemoUser = false;
      }
    }
    
    next();
  } catch (error) {
    // オプション認証なのでエラーを無視して続行
    next();
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: '管理者権限が必要です' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ message: '認証エラー' });
  }
};

module.exports = { auth, optionalAuth, adminAuth };