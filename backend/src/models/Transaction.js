const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  merchant: {
    type: String,
    required: [true, 'Please add a merchant name'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount']
  },
  tax: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['Food', 'Travel', 'Utilities', 'Shopping', 'Entertainment', 'Others'],
    default: 'Others'
  },
  items: [
    {
      name: { type: String, trim: true },
      price: { type: Number }
    }
  ],
  receiptUrl: {
    type: String
  },
  isScanned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
