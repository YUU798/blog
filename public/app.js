
// グローバル変数
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let currentView = 'all'; // 'all' or 'my'

// DOMの読み込み完了後に実行
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// アプリケーションの初期化
function initializeApp() {
    // 認証状態の確認
    if (authToken) {
        checkAuthStatus();
    }

    // 記事一覧の読み込み
    loadArticles();

    // フォームのイベントリスナー設定
    setupEventListeners();
}

// イベントリスナーの設定
function setupEventListeners() {
    // ログインフォーム
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // 登録フォーム
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // 記事作成フォーム
    document.getElementById('articleCreateForm').addEventListener('submit', handleArticleCreate);
    
    // モーダルの外側クリックで閉じる
    window.addEventListener('click', function(event) {
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        const articleCreateModal = document.getElementById('articleCreateModal');
        const articleEditModal = document.getElementById('articleEditModal');
        
        if (event.target === loginModal) {
            closeLoginModal();
        }
        if (event.target === registerModal) {
            closeRegisterModal();
        }
        if (event.target === articleCreateModal) {
            closeArticleCreateModal();
        }
        if (event.target === articleEditModal) {
            closeArticleEditModal();
        }
    });
}

// 認証状態の確認
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateAuthUI();
        } else {
            // トークンが無効な場合
            localStorage.removeItem('authToken');
            authToken = null;
            currentUser = null;
            updateAuthUI();
        }
    } catch (error) {
        console.error('認証状態確認エラー:', error);
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        updateAuthUI();
    }
}

// 認証UIの更新
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const myArticlesTab = document.getElementById('myArticlesTab');
    
    if (currentUser) {
        authButtons.innerHTML = `
            <span style="margin-right: 1rem;">こんにちは、${currentUser.username}さん</span>
            <button class="btn btn-outline" onclick="logout()">ログアウト</button>
            <button class="btn btn-primary" onclick="openArticleCreateModal()">記事を書く</button>
        `;
        myArticlesTab.style.display = 'block';
    } else {
        authButtons.innerHTML = `
            <button class="btn btn-outline" onclick="openLoginModal()">ログイン</button>
            <button class="btn btn-primary" onclick="openRegisterModal()">新規登録</button>
        `;
        myArticlesTab.style.display = 'none';
        // ログアウト時は記事一覧を表示
        if (currentView === 'my') {
            showAllArticles();
        }
    }
}

// ログイン処理
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // エラーメッセージのクリア
    clearErrorMessages('login');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // ログイン成功
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            updateAuthUI();
            closeLoginModal();
            showMessage('ログインに成功しました', 'success');
            loadArticles(); // 記事一覧を再読み込み
        } else {
            // ログイン失敗
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('ログインエラー:', error);
        showMessage('ログイン中にエラーが発生しました', 'error');
    }
}

// 登録処理
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    // エラーメッセージのクリア
    clearErrorMessages('register');
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // 登録成功
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            updateAuthUI();
            closeRegisterModal();
            showMessage('登録が完了しました', 'success');
            loadArticles(); // 記事一覧を再読み込み
        } else {
            // 登録失敗
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('登録エラー:', error);
        showMessage('登録中にエラーが発生しました', 'error');
    }
}

// 記事作成処理
async function handleArticleCreate(event) {
    event.preventDefault();
    
    const title = document.getElementById('articleTitle').value;
    const content = document.getElementById('articleContent').value;
    const tags = document.getElementById('articleTags').value;
    const isPublished = document.getElementById('articlePublished').checked;
    
    // エラーメッセージのクリア
    clearErrorMessages('article');
    
    // 入力バリデーション
    if (!title.trim()) {
        document.getElementById('articleTitleError').textContent = 'タイトルを入力してください';
        return;
    }
    
    if (!content.trim()) {
        document.getElementById('articleContentError').textContent = '本文を入力してください';
        return;
    }
    
    try {
        const response = await fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                title,
                content,
                tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
                isPublished
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 記事作成成功
            closeArticleCreateModal();
            showMessage('記事が作成されました', 'success');
            // 少し遅延させてから記事一覧を再読み込み（サーバー側の処理を確実に反映させるため）
            setTimeout(() => {
                loadArticles();
            }, 500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('記事作成エラー:', error);
        showMessage('記事の作成に失敗しました', 'error');
    }
}

// ログアウト処理
function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    updateAuthUI();
    showMessage('ログアウトしました', 'success');
    loadArticles(); // 記事一覧を再読み込み
}

// 記事一覧の読み込み
async function loadArticles() {
    const articlesGrid = document.getElementById('articlesGrid');
    const articlesTitle = document.getElementById('articlesTitle');
    
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        let url = '/api/articles';
        if (currentView === 'my' && currentUser) {
            url = '/api/articles/user/my-articles';
            articlesTitle.textContent = '自分の記事';
        } else {
            articlesTitle.textContent = '最新記事';
        }
        
        const response = await fetch(url, { headers });
        const data = await response.json();

        if (response.ok) {
            displayArticles(data.articles);
        } else {
            articlesGrid.innerHTML = '<div class="loading">記事の読み込みに失敗しました</div>';
        }
    } catch (error) {
        console.error('記事読み込みエラー:', error);
        articlesGrid.innerHTML = '<div class="loading">記事の読み込みに失敗しました</div>';
    }
}

// 記事の表示
function displayArticles(articles) {
    const articlesGrid = document.getElementById('articlesGrid');
    
    if (articles.length === 0) {
        articlesGrid.innerHTML = '<div class="loading">記事がありません</div>';
        return;
    }

    articlesGrid.innerHTML = articles.map(article => {
        const isMyArticle = currentView === 'my' && currentUser;
        let actionButtons = '';
        let statusBadge = '';
        
        if (isMyArticle) {
            // 公開状態のバッジ
            statusBadge = article.isPublished !== false ?
                '<span style="background-color: #28a745; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.7rem; margin-right: 0.5rem;">公開</span>' :
                '<span style="background-color: #6c757d; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.7rem; margin-right: 0.5rem;">非公開</span>';
            
            actionButtons = `
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <button class="btn btn-outline" onclick="openArticleEditModal('${article._id}', event)" style="font-size: 0.8rem; flex: 1;">編集</button>
                    <button class="btn btn-outline" onclick="deleteArticleDirectly('${article._id}', event)" style="font-size: 0.8rem; flex: 1; background-color: #dc3545; color: white; border-color: #dc3545;">削除</button>
                </div>
            `;
        }
        
        return `
            <div class="article-card" onclick="openArticle('${article._id}')" style="cursor: pointer;">
                <div class="article-image" style="background: #${getRandomColor()}"></div>
                <div class="article-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h3 class="article-title" style="margin: 0; flex: 1;">${escapeHtml(article.title)}</h3>
                        ${statusBadge}
                    </div>
                    <p class="article-excerpt">${escapeHtml(article.content.substring(0, 150))}...</p>
                    <div class="article-meta">
                        <span class="article-author">${escapeHtml(article.author.username)}</span>
                        <span>${formatDate(article.createdAt)}</span>
                    </div>
                    ${actionButtons}
                </div>
            </div>
        `;
    }).join('');
}

// モーダル操作関数
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    clearErrorMessages('login');
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginForm').reset();
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
    clearErrorMessages('register');
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    document.getElementById('registerForm').reset();
}

function openArticleCreateModal() {
    document.getElementById('articleCreateModal').style.display = 'block';
    clearErrorMessages('article');
}

function closeArticleCreateModal() {
    document.getElementById('articleCreateModal').style.display = 'none';
    document.getElementById('articleCreateForm').reset();
}

// ユーティリティ関数
function clearErrorMessages(formType) {
    const elements = document.querySelectorAll(`#${formType}Form .error-message`);
    elements.forEach(el => el.textContent = '');
}

function showMessage(message, type) {
    // シンプルなメッセージ表示（実際の実装ではトースト通知などを使用）
    alert(message);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getRandomColor() {
    const colors = ['007bff', '28a745', 'dc3545', 'ffc107', '17a2b8', '6f42c1'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 記事詳細ページを開く
function openArticle(articleId) {
    window.location.href = `/article.html?id=${articleId}`;
}

// タブ切り替え関数
function showAllArticles() {
    currentView = 'all';
    updateActiveTab();
    loadArticles();
}

function showMyArticles() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    currentView = 'my';
    updateActiveTab();
    loadArticles();
}

function updateActiveTab() {
    const allArticlesTab = document.getElementById('allArticlesTab');
    const myArticlesTab = document.getElementById('myArticlesTab');
    
    if (currentView === 'all') {
        allArticlesTab.style.fontWeight = 'bold';
        allArticlesTab.style.color = '#007bff';
        myArticlesTab.style.fontWeight = 'normal';
        myArticlesTab.style.color = '#333';
    } else {
        allArticlesTab.style.fontWeight = 'normal';
        allArticlesTab.style.color = '#333';
        myArticlesTab.style.fontWeight = 'bold';
        myArticlesTab.style.color = '#007bff';
    }
}

// 記事編集モーダルを開く
async function openArticleEditModal(articleId, event) {
    event.stopPropagation(); // 記事カードのクリックイベントを防止
    
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`/api/articles/${articleId}`, { headers });
        const data = await response.json();

        if (response.ok) {
            const article = data.article;
            document.getElementById('editArticleId').value = article._id;
            document.getElementById('editArticleTitle').value = article.title;
            document.getElementById('editArticleContent').value = article.content;
            document.getElementById('editArticleTags').value = article.tags ? article.tags.join(', ') : '';
            document.getElementById('editArticlePublished').checked = article.isPublished !== false;
            
            document.getElementById('articleEditModal').style.display = 'block';
            clearErrorMessages('edit');
        } else {
            showMessage('記事の取得に失敗しました', 'error');
        }
    } catch (error) {
        console.error('記事取得エラー:', error);
        showMessage('記事の取得に失敗しました', 'error');
    }
}

// 記事編集モーダルを閉じる
function closeArticleEditModal() {
    document.getElementById('articleEditModal').style.display = 'none';
    document.getElementById('articleEditForm').reset();
}

// 記事編集処理
async function handleArticleEdit(event) {
    event.preventDefault();
    
    const articleId = document.getElementById('editArticleId').value;
    const title = document.getElementById('editArticleTitle').value;
    const content = document.getElementById('editArticleContent').value;
    const tags = document.getElementById('editArticleTags').value;
    const isPublished = document.getElementById('editArticlePublished').checked;
    
    // エラーメッセージのクリア
    clearErrorMessages('edit');
    
    // 入力バリデーション
    if (!title.trim()) {
        document.getElementById('editArticleTitleError').textContent = 'タイトルを入力してください';
        return;
    }
    
    if (!content.trim()) {
        document.getElementById('editArticleContentError').textContent = '本文を入力してください';
        return;
    }
    
    try {
        const response = await fetch(`/api/articles/${articleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                title,
                content,
                tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
                isPublished
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 記事更新成功
            closeArticleEditModal();
            showMessage('記事が更新されました', 'success');
            loadArticles(); // 記事一覧を再読み込み
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('記事更新エラー:', error);
        showMessage('記事の更新に失敗しました', 'error');
    }
}

// 記事削除処理（編集モーダルから）
async function deleteArticle() {
    const articleId = document.getElementById('editArticleId').value;
    
    if (!confirm('この記事を削除してもよろしいですか？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/articles/${articleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // 記事削除成功
            closeArticleEditModal();
            showMessage('記事が削除されました', 'success');
            loadArticles(); // 記事一覧を再読み込み
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('記事削除エラー:', error);
        showMessage('記事の削除に失敗しました', 'error');
    }
}

// 直接削除処理（記事一覧から）
async function deleteArticleDirectly(articleId, event) {
    event.stopPropagation(); // 記事カードのクリックイベントを防止
    
    if (!confirm('この記事を削除してもよろしいですか？この操作は元に戻せません。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/articles/${articleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // 記事削除成功
            showMessage('記事が削除されました', 'success');
            loadArticles(); // 記事一覧を再読み込み
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('記事削除エラー:', error);
        showMessage('記事の削除に失敗しました', 'error');
    }
}

// グローバル関数としてエクスポート
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.logout = logout;
window.openArticleCreateModal = openArticleCreateModal;
window.closeArticleCreateModal = closeArticleCreateModal;
window.openArticle = openArticle;
window.showAllArticles = showAllArticles;
window.showMyArticles = showMyArticles;
window.openArticleEditModal = openArticleEditModal;
window.closeArticleEditModal = closeArticleEditModal;
window.deleteArticle = deleteArticle;
window.deleteArticleDirectly = deleteArticleDirectly;

// 記事編集フォームのイベントリスナー設定
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('articleEditForm').addEventListener('submit', handleArticleEdit);
});