const mongoose = require('mongoose');

const DebtSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Lütfen borç veren/borç ismi girin'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Lütfen borç miktarını girin'],
    min: [0, 'Borç miktarı negatif olamaz']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Debt', DebtSchema);
