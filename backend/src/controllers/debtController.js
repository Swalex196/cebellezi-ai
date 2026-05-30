const Debt = require('../models/Debt');
const Transaction = require('../models/Transaction');

// @desc    Get all debts of the user
// @route   GET /api/debts
// @access  Private
const getDebts = async (req, res) => {
  try {
    const debts = await Debt.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: debts.length, data: debts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a new debt
// @route   POST /api/debts
// @access  Private
const createDebt = async (req, res) => {
  try {
    const { name, amount } = req.body;
    if (!name || amount === undefined) {
      return res.status(400).json({ success: false, error: 'İsim ve Miktar alanları zorunludur' });
    }

    const debt = await Debt.create({
      user: req.user.id,
      name,
      amount
    });

    res.status(201).json({ success: true, data: debt });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update a debt (and record expense if paid)
// @route   PUT /api/debts/:id
// @access  Private
const updateDebt = async (req, res) => {
  try {
    const { name, amount } = req.body;
    const debt = await Debt.findById(req.params.id);

    if (!debt) {
      return res.status(404).json({ success: false, error: 'Borç bulunamadı' });
    }

    if (debt.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Yetkisiz işlem' });
    }

    const oldAmount = debt.amount;
    const newAmount = parseFloat(amount) || 0;

    let createdTransaction = null;

    // Check if debt decreased (paid off partially or fully)
    if (newAmount < oldAmount) {
      const paidAmount = oldAmount - newAmount;

      // Automatically create an expense transaction
      createdTransaction = await Transaction.create({
        user: req.user.id,
        merchant: `Borç Ödemesi: ${name || debt.name}`,
        date: new Date(),
        amount: paidAmount,
        tax: 0,
        category: 'Others', // Show as standard expense in Category Budgets
        items: [
          { name: `${debt.name} borcunun bir kısmı/tamamı ödendi.`, price: paidAmount }
        ],
        isScanned: false
      });
    }

    if (name) debt.name = name;
    debt.amount = newAmount;
    await debt.save();

    res.json({
      success: true,
      data: debt,
      createdTransaction // Return transaction to instantly push to frontend
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a debt
// @route   DELETE /api/debts/:id
// @access  Private
const deleteDebt = async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id);

    if (!debt) {
      return res.status(404).json({ success: false, error: 'Borç bulunamadı' });
    }

    if (debt.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Yetkisiz işlem' });
    }

    await debt.deleteOne();
    res.json({ success: true, message: 'Borç silindi' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getDebts,
  createDebt,
  updateDebt,
  deleteDebt
};
