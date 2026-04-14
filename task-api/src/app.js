const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

// Parse JSON request bodies before hitting route handlers.
app.use(express.json());
app.use('/tasks', taskRoutes);

// Keep unknown endpoints consistent with API JSON error format.
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Centralized fallback error handler for uncaught route/service errors.
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

// Exported helper improves testability while preserving runtime startup behavior.
const startServer = (port = PORT) =>
  app.listen(port, () => {
    console.log(`Task API running on port ${port}`);
  });

/* istanbul ignore next */
if (require.main === module) {
  startServer(PORT);
}

module.exports = app;
module.exports.startServer = startServer;
