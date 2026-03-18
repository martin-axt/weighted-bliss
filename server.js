import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || 'localhost';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'dist')));

// API Endpoints
app.get('/api/data', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  const deletedTasks = db.prepare('SELECT * FROM deletedTasks').all();
  const historyRaw = db.prepare('SELECT * FROM history').all();
  const settingsRaw = db.prepare('SELECT * FROM settings').all();

  const history = {};
  historyRaw.forEach(row => history[row.date] = row.weight);

  const settings = {};
  settingsRaw.forEach(row => {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch (e) {
      settings[row.key] = row.value;
    }
  });

  res.json({ tasks, deletedTasks, history, settings });
});

app.post('/api/sync', (req, res) => {
  const { tasks, deletedTasks, history, settings } = req.body;

  const transaction = db.transaction(() => {
    // Sync tasks
    db.prepare('DELETE FROM tasks').run();
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, name, urgency, mood, time, completed, date, createdAt, sum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    tasks.forEach(task => {
      insertTask.run(task.id, task.name, task.urgency, task.mood, task.time, task.completed ? 1 : 0, task.date, task.createdAt, task.sum);
    });

    // Sync deleted tasks
    db.prepare('DELETE FROM deletedTasks').run();
    const insertDeletedTask = db.prepare(`
      INSERT INTO deletedTasks (id, name, urgency, mood, time, completed, date, createdAt, sum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    if (deletedTasks) {
      deletedTasks.forEach(task => {
        insertDeletedTask.run(task.id, task.name, task.urgency, task.mood, task.time, task.completed ? 1 : 0, task.date, task.createdAt, task.sum);
      });
    }

    // Sync history
    db.prepare('DELETE FROM history').run();
    const insertHistory = db.prepare('INSERT INTO history (date, weight) VALUES (?, ?)');
    Object.entries(history).forEach(([date, weight]) => {
      insertHistory.run(date, weight);
    });

    // Sync settings
    db.prepare('DELETE FROM settings').run();
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    Object.entries(settings).forEach(([key, value]) => {
      insertSetting.run(key, JSON.stringify(value));
    });
  });

  transaction();
  res.json({ status: 'success' });
});

app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
