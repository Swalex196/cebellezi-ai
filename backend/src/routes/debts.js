const express = require('express');
const router = express.Router();
const {
  getDebts,
  createDebt,
  updateDebt,
  deleteDebt
} = require('../controllers/debtController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getDebts)
  .post(protect, createDebt);

router.route('/:id')
  .put(protect, updateDebt)
  .delete(protect, deleteDebt);

module.exports = router;
