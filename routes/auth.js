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
const REFER_BONUS = 100;



// This is dangerous for production! Only use in dev/testing
router.get('/mydb', async (req, res) => {
  try {
    // Drop tables if they exist
    await pool.query('DROP TABLE IF EXISTS transactions CASCADE;');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');

    // Recreate users table
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        mobile VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        balance NUMERIC(12,2) DEFAULT 0.00,
        signup_bonus NUMERIC(12,2) DEFAULT 0.00,
        country VARCHAR(50) DEFAULT 'BD',
        currency VARCHAR(10) DEFAULT 'BDT',
        refer_code VARCHAR(20) UNIQUE,
        referred_by VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Recreate transactions table
    await pool.query(`
      CREATE TABLE transactions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        balance_after NUMERIC NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    res.json({ success: true, message: 'Database reset successfully!' });
  } catch (err) {
    console.error('DB reset error:', err);
    res.status(500).json({ error: 'Database reset failed' });
  }
});




// 📌 Signup Route
function genUsername() {
  return 'USER' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate refer code
function genReferCode() {
  return 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Ensure users table exists
async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL,
      mobile VARCHAR(20) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      balance NUMERIC(12,2) DEFAULT 0.00,
      signup_bonus NUMERIC(12,2) DEFAULT 0.00,
      country VARCHAR(50) DEFAULT 'BD',
      currency VARCHAR(10) DEFAULT 'BDT',
      refer_code VARCHAR(20) UNIQUE,
      referred_by VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

router.post('/signup', async (req, res) => {
  try {
    await ensureUsersTable(); // ✅ ensure table exists

    const { full_name, mobile, email, password, refer_code } = req.body;

    // check existing user by mobile or email
    const exists = await pool.query(
      'SELECT id FROM users WHERE mobile=$1 OR email=$2',
      [mobile, email]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // check referral code if provided
    let referredBy = null;
    if (refer_code) {
      const ref = await pool.query(
        'SELECT refer_code FROM users WHERE refer_code=$1',
        [refer_code]
      );
      if (ref.rows.length === 0) {
        return res.status(400).json({ error: 'Wrong refer code' });
      }
      referredBy = ref.rows[0].refer_code;
    }

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const username = genUsername();
    const myReferCode = genReferCode();

    // insert user
    const insert = await pool.query(
      `INSERT INTO users 
      (full_name, username, mobile, email, password_hash, balance, signup_bonus, refer_code, referred_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, username, full_name, mobile, email, balance, refer_code, referred_by`,
      [full_name, username, mobile, email, passwordHash, SIGNUP_BONUS, SIGNUP_BONUS, myReferCode, referredBy]
    );
    const user = insert.rows[0];

    // give bonus to referrer if any
    if (referredBy) {
      await pool.query(
        'UPDATE users SET balance = balance + $1 WHERE refer_code=$2',
        [REFER_BONUS, referredBy]
      );
    }

    // generate JWT
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



    return res.status(201).json({ success: true, token, user });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Signup failed' });
  }
});





// router.post('/signup', async (req, res) => {
//   try {
//     // make sure tables exist
//     await ensureTables();

//     const { error, value } = signupSchema.validate(req.body);
//     if (error) return res.status(400).json({ error: error.message });

//     const { full_name, mobile, password, payment_number, country, currency } = value;

//     const exists = await pool.query('SELECT id FROM users WHERE mobile = $1', [mobile]);
//     if (exists.rows.length) return res.status(400).json({ error: 'Mobile already registered' });

//     const username = genUsername();
//     const hashed = await bcrypt.hash(password, 10);

//     const client = await pool.connect();
//     try {
//       await client.query('BEGIN');
//       const insert = await client.query(
//         `INSERT INTO users (full_name, username, mobile, password_hash, payment_number, country, currency, balance, signup_bonus)
//          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, username, full_name, mobile, balance`,
//         [full_name, username, mobile, hashed, payment_number || null, country || 'BD', currency || 'BDT', SIGNUP_BONUS, SIGNUP_BONUS]
//       );
//       const user = insert.rows[0];

//       if (SIGNUP_BONUS && SIGNUP_BONUS > 0) {
//         await client.query(
//           `INSERT INTO transactions (user_id, type, amount, balance_after, description) 
//            VALUES ($1,'signup_bonus',$2,$3,'Signup bonus applied')`,
//           [user.id, SIGNUP_BONUS, user.balance]
//         );
//       }

//       await client.query('COMMIT');

//       const token = jwt.sign({
//     id: user.id,
//     mobile: user.mobile,
//     username: user.username,
//     full_name: user.full_name,
//     currency: currency || 'BDT'   // 👈 include currency (default BDT if not set)
//   },
//   JWT_SECRET,
//   { expiresIn: '7d' }
// );


//       res.json({
//         success: true,
//         token,
//         user: {
//           id: user.id,
//           username: user.username,
//           full_name: user.full_name,
//           mobile: user.mobile,
//           balance: user.balance
//         }
//       });
//     } catch (err) {
//       await client.query('ROLLBACK');
//       throw err;
//     } finally {
//       client.release();
//     }
//   } catch (err) {
//     console.error('Signup error:', err);
//     res.status(500).json({ error: 'Signup failed' });
//   }
// });
const loginSchema = Joi.object({
  identifier: Joi.string().min(3).required(), // mobile or email
  password: Joi.string().min(6).required()
});

router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const { identifier, password } = value; 
    // 'identifier' can be either email or mobile

    // Check if identifier is email or mobile
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const q = await pool.query(
      isEmail
        ? 'SELECT id, username, full_name, mobile, email, password_hash, balance, currency, refer_code FROM users WHERE email = $1'
        : 'SELECT id, username, full_name, mobile, email, password_hash, balance, currency, refer_code FROM users WHERE mobile = $1',
      [identifier]
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
        email: user.email,
        balance: user.balance,
        currency: user.currency || 'BDT',
        refer_code: user.refer_code
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});


module.exports = router;
