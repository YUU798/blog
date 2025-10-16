// デモモード用の永続的ストレージユーティリティ
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

// データ保存ディレクトリ
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'demoUsers.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'demoArticles.json');

// データディレクトリの初期化
async function initializeDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('データディレクトリを初期化しました:', DATA_DIR);
  } catch (error) {
    console.error('データディレクトリの初期化に失敗しました:', error);
  }
}

// ユーザーデータの読み込み
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は空の配列を返す
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('ユーザーデータの読み込みに失敗しました:', error);
    return [];
  }
}

// ユーザーデータの保存
async function saveUsers(users) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error('ユーザーデータの保存に失敗しました:', error);
    throw error;
  }
}

// 記事データの読み込み
async function loadArticles() {
  try {
    const data = await fs.readFile(ARTICLES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は空の配列を返す
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('記事データの読み込みに失敗しました:', error);
    return [];
  }
}

// 記事データの保存
async function saveArticles(articles) {
  try {
    await fs.writeFile(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf8');
  } catch (error) {
    console.error('記事データの保存に失敗しました:', error);
    throw error;
  }
}

// デモユーザーの初期化
async function initializeDemoUsers() {
  const users = await loadUsers();
  
  // デフォルトのデモユーザーが存在しない場合は追加
  const defaultUserExists = users.some(user => user.email === 'demo@example.com');
  if (!defaultUserExists) {
    const defaultUser = {
      id: 1,
      username: 'demouser',
      email: 'demo@example.com',
      password: bcrypt.hashSync('password123', 10),
      role: 'user',
      createdAt: new Date().toISOString()
    };
    users.push(defaultUser);
    await saveUsers(users);
    console.log('デフォルトデモユーザーを作成しました');
  }
  
  return users;
}

// ユーザー登録（デモモード）
async function registerDemoUser(username, email, password) {
  const users = await loadUsers();
  
  // ユーザー名またはメールアドレスが既に存在するか確認
  const existingUser = users.find(user => 
    user.username === username || user.email === email
  );
  
  if (existingUser) {
    throw new Error('このメールアドレスまたはユーザー名は既に使用されています');
  }

  // 新しいユーザーを作成
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUserId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
  
  const newUser = {
    id: newUserId,
    username,
    email,
    password: hashedPassword,
    role: 'user',
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  await saveUsers(users);
  
  return newUser;
}

// ユーザーログイン（デモモード）
async function loginDemoUser(email, password) {
  const users = await loadUsers();
  const user = users.find(user => user.email === email);
  
  if (!user) {
    throw new Error('メールアドレスまたはパスワードが正しくありません');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('メールアドレスまたはパスワードが正しくありません');
  }

  return user;
}

// ユーザーIDで検索
async function findDemoUserById(id) {
  const users = await loadUsers();
  return users.find(user => user.id === parseInt(id));
}

// デモ記事の追加
async function addDemoArticle(article) {
  const articles = await loadArticles();
  articles.push(article);
  await saveArticles(articles);
  return article;
}

// デモ記事の取得
async function getDemoArticles() {
  return await loadArticles();
}

// デモ記事のIDで検索
async function findDemoArticleById(id) {
  const articles = await loadArticles();
  return articles.find(article => article._id === id);
}

// デモ記事の更新
async function updateDemoArticle(id, updates) {
  const articles = await loadArticles();
  const index = articles.findIndex(article => article._id === id);
  
  if (index === -1) {
    throw new Error('記事が見つかりません');
  }
  
  articles[index] = { ...articles[index], ...updates };
  await saveArticles(articles);
  return articles[index];
}

// デモ記事の削除
async function deleteDemoArticle(id) {
  const articles = await loadArticles();
  const filteredArticles = articles.filter(article => article._id !== id);
  
  if (filteredArticles.length === articles.length) {
    throw new Error('記事が見つかりません');
  }
  
  await saveArticles(filteredArticles);
  return true;
}

// 初期化
initializeDataDirectory().then(() => {
  initializeDemoUsers();
});

module.exports = {
  initializeDataDirectory,
  loadUsers,
  saveUsers,
  loadArticles,
  saveArticles,
  initializeDemoUsers,
  registerDemoUser,
  loginDemoUser,
  findDemoUserById,
  addDemoArticle,
  getDemoArticles,
  findDemoArticleById,
  updateDemoArticle,
  deleteDemoArticle
};