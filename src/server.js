const http = require('http');
const app = require('./app');
const db = require('./config/database');
const { exec } = require('child_process');
const { initSocketService } = require('./services/socketService');

const PORT = process.env.PORT || 3000;

function runMigrations() {
  return new Promise((resolve, reject) => {
    // 2-minute timeout so a hanging migration never blocks startup
    const timer = setTimeout(() => reject(new Error('Migration timed out after 120s')), 120_000);
    exec('npx sequelize-cli db:migrate', { cwd: process.cwd() }, (err, stdout, stderr) => {
      clearTimeout(timer);
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

    // Create HTTP server and attach Socket.io
    const httpServer = http.createServer(app);
    const io = initSocketService(httpServer);
    app.set('io', io); // make io accessible in controllers if needed

    // Bind the port FIRST so Render / health checks can reach us immediately
    httpServer.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    // Run migrations in the background after the server is up
    if (process.env.NODE_ENV === 'production') {
      console.log('Running migrations...');
      runMigrations()
        .then(() => console.log('Migrations complete.'))
        .catch(err => console.error('Migration error (non-fatal):', err.message));
    } else {
      await db.sequelize.sync({ alter: false });
      console.log('Database synced.');
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
