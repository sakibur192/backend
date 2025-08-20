// backend/routes/user.js
const express = require('express');
const pool = require('../services/db');
const auth = require('../middleware/auth');
const router = express.Router();

// Protected profile
router.get('/profile', auth, async (req, res) => {
  try {
    const q = await pool.query('SELECT id, full_name, username, mobile, payment_number, balance, country, currency, created_at FROM users WHERE id=$1', [req.user.id]);
    if (!q.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: q.rows[0] });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const q = await pool.query('SELECT id, type, amount, balance_after, description, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ transactions: q.rows });
  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Admin credit bonus (simple, not protected — protect in production)
router.post('/admin/credit-bonus', async (req, res) => {
  try {
    const { admin_username, target_mobile, amount, note } = req.body;
    if (!admin_username || !target_mobile || !amount) return res.status(400).json({ error: 'Missing fields' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userQ = await client.query('SELECT id, balance FROM users WHERE mobile=$1 FOR UPDATE', [target_mobile]);
      if (!userQ.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'User not found' }); }

      const user = userQ.rows[0];
      const newBalance = parseFloat(user.balance) + parseFloat(amount);

      await client.query('UPDATE users SET balance=$1 WHERE id=$2', [newBalance, user.id]);

      await client.query('INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES ($1,$2,$3,$4,$5)', [user.id, 'admin_bonus', amount, newBalance, note || 'Admin credit']);
      await client.query('INSERT INTO admin_actions (admin_username, action, target_user_id, amount, note) VALUES ($1,$2,$3,$4,$5)', [admin_username, 'credit_bonus', user.id, amount, note || '']);

      await client.query('COMMIT');
      res.json({ success: true, newBalance });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Admin credit error:', err);
    res.status(500).json({ error: 'Failed to credit bonus' });
  }
});

module.exports = router;
