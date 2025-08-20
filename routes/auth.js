// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../services/db');
const Joi = require('joi');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const SIGNUP_BONUS = parseFloat(process.env.SIGNUP_BONUS || '0');

function genUsername() {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `USER${rnd}`;
}

const signupSchema = Joi.object({
  full_name: Joi.string().min(2).required(),
  mobile: Joi.string().min(7).max(20).required(),
  password: Joi.string().min(6).required(),
  payment_number: Joi.string().max(20).optional(),
  country: Joi.string().optional(),
  currency: Joi.string().optional()
});

const loginSchema = Joi.object({
  mobile: Joi.string().min(7).max(20).required(),
  password: Joi.string().required()
});

// Ensure tables exist before signup
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      payment_number TEXT,
      country TEXT,
      currency TEXT,
      balance NUMERIC DEFAULT 0,
      signup_bonus NUMERIC DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      balance_after NUMERIC NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

router.post('/signup', async (req, res) => {
  try {
    // make sure tables exist
    await ensureTables();

    const { error, value } = signupSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const { full_name, mobile, password, payment_number, country, currency } = value;

    const exists = await pool.query('SELECT id FROM users WHERE mobile = $1', [mobile]);
    if (exists.rows.length) return res.status(400).json({ error: 'Mobile already registered' });

    const username = genUsername();
    const hashed = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insert = await client.query(
        `INSERT INTO users (full_name, username, mobile, password_hash, payment_number, country, currency, balance, signup_bonus)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, username, full_name, mobile, balance`,
        [full_name, username, mobile, hashed, payment_number || null, country || 'BD', currency || 'BDT', SIGNUP_BONUS, SIGNUP_BONUS]
      );
      const user = insert.rows[0];

      if (SIGNUP_BONUS && SIGNUP_BONUS > 0) {
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, balance_after, description) 
           VALUES ($1,'signup_bonus',$2,$3,'Signup bonus applied')`,
          [user.id, SIGNUP_BONUS, user.balance]
        );
      }

      await client.query('COMMIT');

      const token = jwt.sign({
    id: user.id,
    mobile: user.mobile,
    username: user.username,
    full_name: user.full_name,
    currency: currency || 'BDT'   // 👈 include currency (default BDT if not set)
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);


      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          mobile: user.mobile,
          balance: user.balance
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const { mobile, password } = value;
    const q = await pool.query(
      'SELECT id, username, full_name, mobile, password_hash, balance, currency FROM users WHERE mobile = $1',
      [mobile]
    );
    if (!q.rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = q.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

const token = jwt.sign(
  {
    id: user.id,
    mobile: user.mobile,
    username: user.username,
    full_name: user.full_name,
    currency: user.currency || 'BDT'
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);

res.json({
  success: true,
  token,
  user: {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    mobile: user.mobile,
    balance: user.balance,
    currency: user.currency || 'BDT'
  }
});


  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
