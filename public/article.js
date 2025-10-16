// グローバル変数
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let currentArticleId = null;

// DOMの読み込み完了後に実行
document.addEventListener('DOMContentLoaded', function() {
    initializeArticlePage();
});

// 記事ページの初期化
function initializeArticlePage() {
    // URLから記事IDを取得
    const urlParams = new URLSearchParams(window.location.search);
    currentArticleId = urlParams.get('id');

    if (!currentArticleId) {
        showError('記事IDが指定されていません');
        return;
    }

    // 認証状態の確認
    if (authToken) {
        checkAuthStatus();
    } else {
        updateAuthUI();
    }

    // 記事とコメントの読み込み
    loadArticle();
    loadComments();
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
            setupCommentForm();
        } else {
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
    
    if (currentUser) {
        authButtons.innerHTML = `
            <span style="margin-right: 1rem;">こんにちは、${currentUser.username}さん</span>
            <button class="btn btn-outline" onclick="logout()">ログアウト</button>
        `;
    } else {
        authButtons.innerHTML = `
            <button class="btn btn-outline" onclick="openLoginModal()">ログイン</button>
            <button class="btn btn-primary" onclick="openRegisterModal()">新規登録</button>
        `;
    }
}

// 記事の読み込み
async function loadArticle() {
    const articleContent = document.getElementById('articleContent');
    
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`/api/articles/${currentArticleId}`, { headers });
        const data = await response.json();

        if (response.ok) {
            displayArticle(data.article);
        } else {
            showError('記事が見つかりません');
        }
    } catch (error) {
        console.error('記事読み込みエラー:', error);
        showError('記事の読み込みに失敗しました');
    }
}

// 記事の表示
function displayArticle(article) {
    const articleContent = document.getElementById('articleContent');
    
    articleContent.innerHTML = `
        <article class="article-detail">
            <div class="article-header">
                <h1 class="article-title">${escapeHtml(article.title)}</h1>
                <div class="article-meta">
                    <span class="article-author">${escapeHtml(article.author.username)}</span>
                    <span>${formatDate(article.createdAt)} • ${article.viewCount} 回閲覧</span>
                </div>
            </div>
            <div class="article-content">
                ${formatArticleContent(article.content)}
            </div>
        </article>
    `;

    // ページタイトルを更新
    document.title = `${article.title} - ブログシステム`;
}

// コメントの読み込み
async function loadComments() {
    const commentsList = document.getElementById('commentsList');
    
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`/api/comments/article/${currentArticleId}`, { headers });
        const data = await response.json();

        if (response.ok) {
            displayComments(data.comments);
        } else {
            commentsList.innerHTML = '<div class="error-message">コメントの読み込みに失敗しました</div>';
        }
    } catch (error) {
        console.error('コメント読み込みエラー:', error);
        commentsList.innerHTML = '<div class="error-message">コメントの読み込みに失敗しました</div>';
    }
}

// コメントの表示
function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<div class="loading">コメントはまだありません。最初のコメントを投稿してみましょう！</div>';
        return;
    }

    commentsList.innerHTML = comments.map(comment => `
        <div class="comment" data-comment-id="${comment._id}">
            <div class="comment-header">
                <div class="comment-author-info">
                    <span class="comment-author">${escapeHtml(comment.author.username)}</span>
                    <span class="comment-badge">${comment.author.username === '匿名ユーザー' ? '匿名' : '投稿者'}</span>
                </div>
                <span class="comment-date">${formatDate(comment.createdAt)}</span>
            </div>
            <div class="comment-content">
                ${escapeHtml(comment.content)}
            </div>
            <div class="comment-actions">
                ${currentUser ? `
                    <button class="btn-reply" onclick="showReplyForm('${comment._id}')">返信</button>
                    ${currentUser && (currentUser._id === comment.author._id || currentUser.role === 'admin') && comment.author.username !== '匿名ユーザー' ? `
                        <button class="btn-edit" onclick="editComment('${comment._id}')">編集</button>
                        <button class="btn-delete" onclick="deleteComment('${comment._id}')">削除</button>
                    ` : ''}
                ` : ''}
            </div>
            ${comment.replies && comment.replies.length > 0 ? `
                <div class="comment-replies">
                    ${comment.replies.map(reply => `
                        <div class="comment reply" data-comment-id="${reply._id}">
                            <div class="comment-header">
                                <div class="comment-author-info">
                                    <span class="comment-author">${escapeHtml(reply.author.username)}</span>
                                    <span class="comment-badge">${reply.author.username === '匿名ユーザー' ? '匿名' : '返信'}</span>
                                </div>
                                <span class="comment-date">${formatDate(reply.createdAt)}</span>
                            </div>
                            <div class="comment-content">
                                ${escapeHtml(reply.content)}
                            </div>
                            <div class="comment-actions">
                                ${currentUser && (currentUser._id === reply.author._id || currentUser.role === 'admin') && reply.author.username !== '匿名ユーザー' ? `
                                    <button class="btn-edit" onclick="editComment('${reply._id}')">編集</button>
                                    <button class="btn-delete" onclick="deleteComment('${reply._id}')">削除</button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// コメントフォームの設定
function setupCommentForm(parentCommentId = null) {
    const commentFormContainer = document.getElementById('commentFormContainer');
    
    const isReply = parentCommentId !== null;
    const placeholder = isReply ? '返信を入力してください...' : 'コメントを入力してください...';
    const buttonText = isReply ? '返信を投稿' : 'コメントを投稿';
    
    commentFormContainer.innerHTML = `
        <form id="commentForm" class="comment-form">
            ${isReply ? '<div class="reply-indicator">返信を投稿しています</div>' : ''}
            <div class="form-group">
                <textarea
                    id="commentContent"
                    class="form-control"
                    placeholder="${placeholder}"
                    required
                    maxlength="1000"
                ></textarea>
                <div class="character-count">
                    <span id="charCount">0</span>/1000 文字
                </div>
            </div>
            ${!currentUser ? `
                <div class="anonymous-notice">
                    <p>※ 匿名でコメントを投稿します</p>
                </div>
            ` : ''}
            <div class="form-actions">
                ${isReply ? `<button type="button" class="btn btn-outline" onclick="cancelReply()">キャンセル</button>` : ''}
                <button type="submit" class="btn btn-primary">${buttonText}</button>
            </div>
            <input type="hidden" id="parentCommentId" value="${parentCommentId || ''}">
        </form>
    `;

    // 文字数カウントの設定
    const textarea = document.getElementById('commentContent');
    const charCount = document.getElementById('charCount');
    
    textarea.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = length;
        if (length > 950) {
            charCount.style.color = '#dc3545';
        } else if (length > 800) {
            charCount.style.color = '#ffc107';
        } else {
            charCount.style.color = '#666';
        }
    });

    document.getElementById('commentForm').addEventListener('submit', handleCommentSubmit);
}

// 返信フォームの表示
function showReplyForm(commentId) {
    setupCommentForm(commentId);
    document.getElementById('commentContent').focus();
}

// 返信のキャンセル
function cancelReply() {
    setupCommentForm();
}

// コメント編集
function editComment(commentId) {
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    const content = commentElement.querySelector('.comment-content').textContent;
    
    const editForm = `
        <form class="edit-form" onsubmit="saveCommentEdit('${commentId}', event)">
            <textarea class="form-control edit-textarea">${escapeHtml(content)}</textarea>
            <div class="edit-actions">
                <button type="button" class="btn btn-outline" onclick="cancelEdit('${commentId}')">キャンセル</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `;
    
    commentElement.querySelector('.comment-content').innerHTML = editForm;
    commentElement.querySelector('.edit-textarea').focus();
}

// コメント編集のキャンセル
function cancelEdit(commentId) {
    loadComments(); // コメントを再読み込みして元の状態に戻す
}

// コメント編集の保存
async function saveCommentEdit(commentId, event) {
    event.preventDefault();
    
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    const newContent = commentElement.querySelector('.edit-textarea').value.trim();
    
    if (!newContent) {
        showMessage('コメント内容を入力してください', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ content: newContent })
        });
        
        if (response.ok) {
            showMessage('コメントを更新しました', 'success');
            loadComments(); // コメントを再読み込み
        } else {
            const data = await response.json();
            showMessage(data.message || 'コメントの更新に失敗しました', 'error');
        }
    } catch (error) {
        console.error('コメント更新エラー:', error);
        showMessage('コメントの更新に失敗しました', 'error');
    }
}

// コメント削除
async function deleteComment(commentId) {
    if (!confirm('このコメントを削除しますか？この操作は元に戻せません。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showMessage('コメントを削除しました', 'success');
            // 即時反映のために画面から削除
            removeCommentFromDisplay(commentId);
        } else {
            const data = await response.json();
            showMessage(data.message || 'コメントの削除に失敗しました', 'error');
        }
    } catch (error) {
        console.error('コメント削除エラー:', error);
        showMessage('コメントの削除に失敗しました', 'error');
    }
}

// コメントを画面から削除
function removeCommentFromDisplay(commentId) {
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (commentElement) {
        // 返信コメントの場合は親要素から削除
        if (commentElement.classList.contains('reply')) {
            commentElement.remove();
            
            // 返信がなくなった場合、返信セクションを削除
            const parentComment = commentElement.closest('.comment');
            const repliesSection = parentComment.querySelector('.comment-replies');
            if (repliesSection && repliesSection.children.length === 0) {
                repliesSection.remove();
            }
        } else {
            // 親コメントの場合は完全に削除
            commentElement.remove();
            
            // コメントがなくなった場合のメッセージ表示
            const commentsList = document.getElementById('commentsList');
            if (commentsList.children.length === 0) {
                commentsList.innerHTML = '<div class="loading">コメントはまだありません。最初のコメントを投稿してみましょう！</div>';
            }
        }
    } else {
        // 要素が見つからない場合は再読み込み
        loadComments();
    }
}

// コメント投稿処理
async function handleCommentSubmit(event) {
    event.preventDefault();
    
    const content = document.getElementById('commentContent').value.trim();
    const parentCommentId = document.getElementById('parentCommentId').value || null;
    
    if (!content) {
        showMessage('コメント内容を入力してください', 'error');
        return;
    }

    if (content.length > 1000) {
        showMessage('コメントは1000文字以内で入力してください', 'error');
        return;
    }

    setCommentButtonLoading(true);

    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // ログインしている場合のみ認証トークンを追加
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch('/api/comments', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                content,
                articleId: currentArticleId,
                parentCommentId: parentCommentId || undefined
            })
        });

        const data = await response.json();

        if (response.ok) {
            // コメント投稿成功
            document.getElementById('commentContent').value = '';
            showMessage(parentCommentId ? '返信を投稿しました' : 'コメントが投稿されました', 'success');
            
            // 即時反映のために新しいコメントを追加
            if (data.comment) {
                await addNewCommentToDisplay(data.comment, parentCommentId);
            } else {
                // データがない場合は再読み込み
                await loadComments();
            }
            
            setupCommentForm(); // フォームをリセット
        } else {
            showMessage(data.message || 'コメントの投稿に失敗しました', 'error');
        }
    } catch (error) {
        console.error('コメント投稿エラー:', error);
        showMessage('コメントの投稿に失敗しました', 'error');
    } finally {
        setCommentButtonLoading(false);
    }
}

// 新しいコメントを画面に追加
async function addNewCommentToDisplay(newComment, parentCommentId = null) {
    const commentsList = document.getElementById('commentsList');
    
    if (parentCommentId) {
        // 返信の場合、親コメントの返信セクションに追加
        const parentComment = document.querySelector(`[data-comment-id="${parentCommentId}"]`);
        if (parentComment) {
            let repliesSection = parentComment.querySelector('.comment-replies');
            if (!repliesSection) {
                repliesSection = document.createElement('div');
                repliesSection.className = 'comment-replies';
                parentComment.appendChild(repliesSection);
            }
            
            const replyHtml = `
                <div class="comment reply" data-comment-id="${newComment._id}">
                    <div class="comment-header">
                        <div class="comment-author-info">
                            <span class="comment-author">${escapeHtml(newComment.author.username)}</span>
                            <span class="comment-badge">${newComment.author.username === '匿名ユーザー' ? '匿名' : '返信'}</span>
                        </div>
                        <span class="comment-date">${formatDate(newComment.createdAt)}</span>
                    </div>
                    <div class="comment-content">
                        ${escapeHtml(newComment.content)}
                    </div>
                    <div class="comment-actions">
                        ${currentUser && (currentUser._id === newComment.author._id || currentUser.role === 'admin') && newComment.author.username !== '匿名ユーザー' ? `
                            <button class="btn-edit" onclick="editComment('${newComment._id}')">編集</button>
                            <button class="btn-delete" onclick="deleteComment('${newComment._id}')">削除</button>
                        ` : ''}
                    </div>
                </div>
            `;
            
            repliesSection.innerHTML += replyHtml;
        } else {
            // 親コメントが見つからない場合は再読み込み
            await loadComments();
        }
    } else {
        // 新規コメントの場合、リストの先頭に追加
        const commentHtml = `
            <div class="comment" data-comment-id="${newComment._id}">
                <div class="comment-header">
                    <div class="comment-author-info">
                        <span class="comment-author">${escapeHtml(newComment.author.username)}</span>
                        <span class="comment-badge">${newComment.author.username === '匿名ユーザー' ? '匿名' : '投稿者'}</span>
                    </div>
                    <span class="comment-date">${formatDate(newComment.createdAt)}</span>
                </div>
                <div class="comment-content">
                    ${escapeHtml(newComment.content)}
                </div>
                <div class="comment-actions">
                    ${currentUser ? `
                        <button class="btn-reply" onclick="showReplyForm('${newComment._id}')">返信</button>
                        ${currentUser && (currentUser._id === newComment.author._id || currentUser.role === 'admin') && newComment.author.username !== '匿名ユーザー' ? `
                            <button class="btn-edit" onclick="editComment('${newComment._id}')">編集</button>
                            <button class="btn-delete" onclick="deleteComment('${newComment._id}')">削除</button>
                        ` : ''}
                    ` : ''}
                </div>
                <div class="comment-replies"></div>
            </div>
        `;
        
        // コメントリストが空の場合は置き換え、そうでない場合は先頭に追加
        if (commentsList.innerHTML.includes('コメントはまだありません')) {
            commentsList.innerHTML = commentHtml;
        } else {
            commentsList.innerHTML = commentHtml + commentsList.innerHTML;
        }
    }
}

// ログイン処理
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
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
            setupCommentForm();
            loadComments(); // コメント一覧を再読み込み
        } else {
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
            setupCommentForm();
            loadComments(); // コメント一覧を再読み込み
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        console.error('登録エラー:', error);
        showMessage('登録中にエラーが発生しました', 'error');
    }
}

// ログアウト処理
function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    updateAuthUI();
    showMessage('ログアウトしました', 'success');
    setupCommentForm();
    loadComments(); // コメント一覧を再読み込み
}

// ユーティリティ関数
function formatArticleContent(content) {
    // シンプルな改行処理（実際の実装ではMarkdownパーサーなどを使用）
    return content.split('\n').map(paragraph => {
        if (paragraph.trim() === '') return '<br>';
        return `<p>${escapeHtml(paragraph)}</p>`;
    }).join('');
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
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(message) {
    const articleContent = document.getElementById('articleContent');
    articleContent.innerHTML = `<div class="error-message">${message}</div>`;
}

function showMessage(message, type) {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // 新しいメッセージを作成
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);

    // 3秒後にメッセージを自動的に削除
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// モーダル操作関数
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('loginForm').reset();
    // 既存のイベントリスナーを削除してから追加
    const loginForm = document.getElementById('loginForm');
    loginForm.removeEventListener('submit', handleLogin);
    loginForm.addEventListener('submit', handleLogin);
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
    document.getElementById('registerForm').reset();
    // 既存のイベントリスナーを削除してから追加
    const registerForm = document.getElementById('registerForm');
    registerForm.removeEventListener('submit', handleRegister);
    registerForm.addEventListener('submit', handleRegister);
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
}

// モーダル外クリックで閉じる
window.addEventListener('click', function(event) {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === registerModal) {
        closeRegisterModal();
    }
});

// コメント投稿時のローディング状態
function setCommentButtonLoading(isLoading) {
    const submitButton = document.querySelector('#commentForm button[type="submit"]');
    if (submitButton) {
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.textContent = '投稿中...';
        } else {
            submitButton.disabled = false;
            submitButton.textContent = 'コメントを投稿';
        }
    }
}

// グローバル関数としてエクスポート
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.logout = logout;
window.showReplyForm = showReplyForm;
window.cancelReply = cancelReply;
window.editComment = editComment;
window.cancelEdit = cancelEdit;
window.saveCommentEdit = saveCommentEdit;
window.deleteComment = deleteComment;
window.removeCommentFromDisplay = removeCommentFromDisplay;
window.addNewCommentToDisplay = addNewCommentToDisplay;