from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///blog.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# ユーザーモデル
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# 記事モデル
class Article(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_published = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    author = db.relationship('User', backref=db.backref('articles', lazy=True))

# コメントモデル
class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    author = db.relationship('User', backref=db.backref('comments', lazy=True))
    article = db.relationship('Article', backref=db.backref('comments', lazy=True))

# 返信モデル
class Reply(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    comment_id = db.Column(db.Integer, db.ForeignKey('comment.id'), nullable=False)
    parent_reply_id = db.Column(db.Integer, db.ForeignKey('reply.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    author = db.relationship('User', backref=db.backref('replies', lazy=True))
    comment = db.relationship('Comment', backref=db.backref('replies', lazy=True))
    parent_reply = db.relationship('Reply', remote_side=[id], backref=db.backref('child_replies', lazy=True))
    
    def get_child_replies(self):
        return Reply.query.filter_by(parent_reply_id=self.id).order_by(Reply.created_at.asc()).all()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ルート定義
@app.route('/')
def index():
    try:
        articles = Article.query.filter_by(is_published=True).order_by(Article.created_at.desc()).all()
        return render_template('index.html', articles=articles)
    except Exception as e:
        return f"Error: {str(e)}", 500

@app.route('/article/<int:article_id>')
def article_detail(article_id):
    article = Article.query.get_or_404(article_id)
    if not article.is_published and (not current_user.is_authenticated or current_user.id != article.author_id):
        flash('この記事は非公開です')
        return redirect(url_for('index'))
    comments = Comment.query.filter_by(article_id=article_id).order_by(Comment.created_at.desc()).all()
    return render_template('article_detail.html', article=article, comments=comments)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user)
            flash('ログインに成功しました')
            return redirect(url_for('index'))
        else:
            flash('メールアドレスまたはパスワードが正しくありません')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if User.query.filter_by(email=email).first():
            flash('このメールアドレスは既に登録されています')
            return render_template('register.html')
        
        if User.query.filter_by(username=username).first():
            flash('このユーザー名は既に使用されています')
            return render_template('register.html')
        
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        flash('登録が完了しました。ログインしてください。')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('ログアウトしました')
    return redirect(url_for('index'))

@app.route('/create', methods=['GET', 'POST'])
@login_required
def create_article():
    if request.method == 'POST':
        title = request.form.get('title')
        content = request.form.get('content')
        is_published = request.form.get('is_published') == 'on'
        
        article = Article(
            title=title,
            content=content,
            author_id=current_user.id,
            is_published=is_published
        )
        db.session.add(article)
        db.session.commit()
        
        flash('記事が作成されました')
        return redirect(url_for('index'))
    
    return render_template('create_article.html')

@app.route('/my-articles')
@login_required
def my_articles():
    articles = Article.query.filter_by(author_id=current_user.id).order_by(Article.created_at.desc()).all()
    return render_template('my_articles.html', articles=articles)

@app.route('/edit/<int:article_id>', methods=['GET', 'POST'])
@login_required
def edit_article(article_id):
    article = Article.query.get_or_404(article_id)
    
    if article.author_id != current_user.id:
        flash('この記事を編集する権限がありません')
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        article.title = request.form.get('title')
        article.content = request.form.get('content')
        article.is_published = request.form.get('is_published') == 'on'
        article.updated_at = datetime.utcnow()
        
        db.session.commit()
        flash('記事が更新されました')
        return redirect(url_for('article_detail', article_id=article.id))
    
    return render_template('edit_article.html', article=article)

@app.route('/delete/<int:article_id>')
@login_required
def delete_article(article_id):
    article = Article.query.get_or_404(article_id)
    
    if article.author_id != current_user.id:
        flash('この記事を削除する権限がありません')
        return redirect(url_for('index'))
    
    db.session.delete(article)
    db.session.commit()
    flash('記事が削除されました')
    return redirect(url_for('my_articles'))

@app.route('/article/<int:article_id>/comment', methods=['POST'])
@login_required
def add_comment(article_id):
    article = Article.query.get_or_404(article_id)
    content = request.form.get('content')
    
    if not content:
        flash('コメントを入力してください')
        return redirect(url_for('article_detail', article_id=article_id))
    
    comment = Comment(
        content=content,
        author_id=current_user.id,
        article_id=article_id
    )
    
    db.session.add(comment)
    db.session.commit()
    
    flash('コメントが投稿されました')
    return redirect(url_for('article_detail', article_id=article_id))

@app.route('/comment/<int:comment_id>/reply', methods=['POST'])
@login_required
def add_reply(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    content = request.form.get('content')
    
    if not content:
        flash('返信を入力してください')
        return redirect(url_for('article_detail', article_id=comment.article_id))
    
    reply = Reply(
        content=content,
        author_id=current_user.id,
        comment_id=comment_id
    )
    
    db.session.add(reply)
    db.session.commit()
    
    flash('返信が投稿されました')
    return redirect(url_for('article_detail', article_id=comment.article_id))

@app.route('/reply/<int:reply_id>/reply', methods=['POST'])
@login_required
def add_reply_to_reply(reply_id):
    parent_reply = Reply.query.get_or_404(reply_id)
    content = request.form.get('content')
    
    if not content:
        flash('返信を入力してください')
        return redirect(url_for('article_detail', article_id=parent_reply.comment.article_id))
    
    reply = Reply(
        content=content,
        author_id=current_user.id,
        comment_id=parent_reply.comment_id,
        parent_reply_id=reply_id
    )
    
    db.session.add(reply)
    db.session.commit()
    
    flash('返信が投稿されました')
    return redirect(url_for('article_detail', article_id=parent_reply.comment.article_id))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5002)