const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const familiesRoutes = require('./routes/families.routes');
const surnamesRoutes = require('./routes/surnames.routes');
const regionsRoutes = require('./routes/regions.routes');
const expertiseRoutes = require('./routes/expertise.routes');
const peopleRoutes = require('./routes/people.routes');
const treeRoutes = require('./routes/tree.routes');

const app = express();
app.use(express.json());
app.use(cors({ origin: [process.env.CORS_ORIGIN || 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/families', familiesRoutes);
app.use('/api/v1/surnames', surnamesRoutes);
app.use('/api/v1/regions', regionsRoutes);
app.use('/api/v1/expertise', expertiseRoutes);
app.use('/api/v1/people', peopleRoutes);
app.use('/api/v1/tree', treeRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

module.exports = app;
