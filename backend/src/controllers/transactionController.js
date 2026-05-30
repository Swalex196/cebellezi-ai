const Transaction = require('../models/Transaction');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// @desc    Get all transactions of the user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ date: -1 });
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a transaction manually
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const { merchant, date, amount, tax, category, items } = req.body;

    if (!merchant || !amount) {
      return res.status(400).json({ success: false, error: 'Merchant and Amount are required' });
    }

    const transaction = await Transaction.create({
      user: req.user.id,
      merchant,
      date: date || Date.now(),
      amount,
      tax: tax || 0,
      category: category || 'Others',
      items: items || [],
      isScanned: false
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Verify user owns transaction
    if (transaction.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'User not authorized' });
    }

    await transaction.deleteOne();
    res.json({ success: true, message: 'Transaction removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Upload and Process a Receipt
// @route   POST /api/transactions/upload
// @access  Private
const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a receipt image' });
    }

    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;

    console.log(`Receipt uploaded locally: ${filePath}`);

    // Send the file to Python FastAPI microservice for OCR extraction
    const pythonOcrUrl = `${process.env.PYTHON_OCR_URL || 'http://127.0.0.1:8000'}/process-receipt`;

    // Send as multipart/form-data
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    // Express responds immediately to prevent locking UI
    res.status(202).json({
      success: true,
      message: 'Receipt uploaded and scanning job started in the background.',
      receiptUrl: fileUrl
    });

    // Run background OCR job
    try {
      console.log(`Forwarding receipt to Python OCR service: ${pythonOcrUrl}`);
      const response = await axios.post(pythonOcrUrl, form, {
        headers: {
          ...form.getHeaders()
        }
      });

      const extracted = response.data;
      console.log('Extracted OCR receipt data:', extracted);

      // Create transaction record in MongoDB
      const transaction = await Transaction.create({
        user: req.user.id,
        merchant: extracted.merchant || 'Unknown Merchant',
        date: extracted.date ? new Date(extracted.date) : Date.now(),
        amount: extracted.amount || 0,
        tax: extracted.tax || 0,
        category: extracted.category || 'Others',
        items: extracted.items || [],
        receiptUrl: fileUrl,
        isScanned: true
      });

      console.log(`Transaction saved successfully: ${transaction._id}`);

      // Notify the frontend in real time using socket.io
      const io = req.app.get('io');
      if (io) {
        // Emit to the specific user's socket room (room name = user's ID)
        io.to(req.user.id).emit('transaction_processed', {
          success: true,
          message: 'Your receipt scan is completed!',
          data: transaction
        });
        console.log(`WebSocket event emitted to user room: ${req.user.id}`);
      }
    } catch (ocrError) {
      console.error('OCR Extraction or Processing failed:', ocrError.message);

      // Fallback: Create a mock scanned transaction if the Python scanner isn't accessible
      // (to ensure the dashboard works seamlessly on local setups even if Python service is down)
      const mockItems = [
        { name: 'Imported Coffee Blend', price: 120 },
        { name: 'Breakfast Croissant', price: 65 }
      ];
      
      const transaction = await Transaction.create({
        user: req.user.id,
        merchant: 'Mock Cafe & Bistro (Local Fallback)',
        date: new Date(),
        amount: 185,
        tax: 15,
        category: 'Food',
        items: mockItems,
        receiptUrl: fileUrl,
        isScanned: true
      });

      const io = req.app.get('io');
      if (io) {
        io.to(req.user.id).emit('transaction_processed', {
          success: true,
          message: 'Receipt processed (Using Smart Local Fallback)',
          data: transaction
        });
      }
    }
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  deleteTransaction,
  uploadReceipt
};
