const app = require('./app');
const db = require('./config/database');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;

function runMigrations() {
  return new Promise((resolve, reject) => {
    exec('npx sequelize-cli db:migrate', { cwd: process.cwd() }, (err, stdout, stderr) => {
      if (stdout) console.log('[migrate]', stdout.trim());
      if (stderr) console.warn('[migrate stderr]', stderr.trim());
      if (err) return reject(err);
      resolve();
    });
  });
}

async function start() {
  try {
    // Test DB connection
    await db.sequelize.authenticate();
    console.log('Database connected.');

    // Run pending migrations automatically on every deploy
    if (process.env.NODE_ENV === 'production') {
      console.log('Running migrations...');
      await runMigrations();
      console.log('Migrations complete.');
    } else {
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
