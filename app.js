const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authMiddleware = require("./middleware/authMiddleware");
const pool = require('./services/db');

dotenv.config();

require('./services/db'); // ensure db connection established

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const gameRoutes = require('./routes/games');
const ppRoutes = require('./routes/pp');
const evoRoutes = require('./routes/evo')



app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/fastspin', gameRoutes);
app.use('/api/pp', ppRoutes);
app.use('/api/evo', evoRoutes);



app.get("/api/user/balance", authMiddleware, async (req, res) => {
  const result = await pool.query("SELECT balance FROM users WHERE id = $1", [req.user.id]);
  res.json({ balance: result.rows[0]?.balance || 0 });
});





app.get('/', (req, res) => res.send('Gaming API running'));





const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
