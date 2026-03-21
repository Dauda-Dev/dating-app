const app = require('./app');
const db = require('./config/database');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Test DB connection
    await db.sequelize.authenticate();
    console.log('Database connected.');

    // In development, sync models if desired (comment out in production)
    if (process.env.NODE_ENV !== 'production') {
      await db.sequelize.sync({ alter: false });
      console.log('Database synced.');
    }

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
