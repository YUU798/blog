// デモモード用の認証ユーティリティ
const jwt = require('jsonwebtoken');
const {
  registerDemoUser,
  loginDemoUser,
  findDemoUserById,
  initializeDemoUsers
} = require('./demoStorage');

// JWTトークンを生成
function generateDemoToken(user) {
  return jwt.sign(
    { id: user.id, demo: true },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// デモトークンを検証
async function verifyDemoToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.demo) {
      return null; // デモトークンでない
    }
    return await findDemoUserById(decoded.id);
  } catch (error) {
    return null;
  }
}

// 初期化
initializeDemoUsers();

module.exports = {
  registerDemoUser,
  loginDemoUser,
  findDemoUserById,
  generateDemoToken,
  verifyDemoToken
};