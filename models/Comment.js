const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'コメント内容は必須です'],
    trim: true,
    minlength: [1, 'コメントは1文字以上で入力してください'],
    maxlength: [1000, 'コメントは1000文字以内で入力してください']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  isApproved: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// コメントを取得する際に著者情報をポピュレート
commentSchema.pre('find', function(next) {
  this.populate('author', 'username email');
  next();
});

commentSchema.pre('findOne', function(next) {
  this.populate('author', 'username email');
  next();
});

// 記事に対するコメント数を管理する仮想フィールド
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment'
});

// 仮想フィールドをJSONに含める
commentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Comment', commentSchema);