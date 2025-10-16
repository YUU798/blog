const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '記事タイトルは必須です'],
    trim: true,
    minlength: [1, '記事タイトルは1文字以上で入力してください'],
    maxlength: [200, '記事タイトルは200文字以内で入力してください']
  },
  content: {
    type: String,
    required: [true, '記事本文は必須です'],
    minlength: [1, '記事本文は1文字以上で入力してください']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  featuredImage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 記事を取得する際に著者情報をポピュレート
articleSchema.pre('find', function(next) {
  this.populate('author', 'username email');
  next();
});

articleSchema.pre('findOne', function(next) {
  this.populate('author', 'username email');
  next();
});

// ビューカウントを増加させるメソッド
articleSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  await this.save();
};

module.exports = mongoose.model('Article', articleSchema);