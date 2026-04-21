const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Initialize DB
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, lessons: [] }));
}

const getDB = () => JSON.parse(fs.readFileSync(DB_PATH));
const saveDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// ═══════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════

// Words Database Cache
let wordsCache = null;
const getWordsDB = () => {
  if (!wordsCache) {
    try {
      const wordsPath = path.join(__dirname, 'assets', 'data', 'words.json');
      wordsCache = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
    } catch (e) {
      console.error('Failed to load words.json', e);
      wordsCache = [];
    }
  }
  return wordsCache;
};

// User Login/Sync
app.post('/api/user/sync', (req, res) => {
  const { deviceId, name, age, level, progress } = req.body;
  const db = getDB();
  
  if (!db.users[deviceId]) {
    db.users[deviceId] = { name, age, level, progress: progress || 0, createdAt: new Date() };
  } else {
    // Update existing user data
    db.users[deviceId] = { ...db.users[deviceId], name, age, level, progress: progress || db.users[deviceId].progress };
  }
  
  saveDB(db);
  res.json({ success: true, user: db.users[deviceId] });
});

// Get User Profile
app.get('/api/user/:deviceId', (req, res) => {
  const db = getDB();
  const user = db.users[req.params.deviceId];
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Update Progress
app.post('/api/user/progress', (req, res) => {
  const { deviceId, progress } = req.body;
  const db = getDB();
  if (db.users[deviceId]) {
    db.users[deviceId].progress = progress;
    saveDB(db);
    res.json({ success: true, progress });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Get Lessons (Wagons)
app.get('/api/lessons', (req, res) => {
  // Hardcoded for now, but could be dynamic
  const lessons = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    title: `Lesson ${i + 1}`,
    type: 'dars',
  }));
  res.json(lessons);
});

// Get Random Words for specific letters
// Example: GET /api/words?letters=A,B&count=4
app.get('/api/words', (req, res) => {
  const lettersQuery = req.query.letters;
  const count = parseInt(req.query.count) || 4;
  
  if (!lettersQuery) {
    return res.status(400).json({ error: 'Letters query parameter is required (e.g. ?letters=A,B)' });
  }
  
  const letters = lettersQuery.split(',').map(l => l.trim().toLowerCase());
  const wordsDB = getWordsDB();
  
  // Flatten all words from the DB
  const allWords = wordsDB.reduce((acc, section) => {
    return acc.concat(section.words);
  }, []);
  
  const result = {};
  
  letters.forEach(letter => {
    // Filter words starting with this letter
    const matchingWords = allWords.filter(w => w.en.toLowerCase().startsWith(letter));
    
    // Remove duplicates based on English word
    const uniqueWords = Array.from(new Map(matchingWords.map(item => [item.en, item])).values());
    
    // Shuffle and pick `count` words
    const shuffled = uniqueWords.sort(() => 0.5 - Math.random());
    result[letter.toUpperCase()] = shuffled.slice(0, count);
  });
  
  res.json(result);
});

// Mock Pronunciation Check
// Always returns a score and success true/false
app.post('/api/check-voice', (req, res) => {
  // We can just simulate a score between 60 and 100 for a realistic mock
  // Or force it to pass based on some logic if needed.
  // We'll simulate 80% pass rate.
  const isSuccess = Math.random() > 0.2;
  const score = isSuccess ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 30) + 40;
  
  setTimeout(() => {
    res.json({ success: isSuccess, score });
  }, 1000); // add 1s delay to simulate processing
});
// Get words for a specific level and lesson
// Example: GET /api/lesson-words?level=A1&lesson=1
app.get('/api/lesson-words', (req, res) => {
  const { level, lesson } = req.query;
  if (!level || !lesson) {
    return res.status(400).json({ error: 'level and lesson query parameters are required' });
  }

  const wordsDB = getWordsDB();
  const entry = wordsDB.find(
    (e) => e.level.toUpperCase() === level.toString().toUpperCase() && e.lesson === parseInt(lesson)
  );

  if (!entry) {
    return res.status(404).json({ error: `No words found for level=${level} lesson=${lesson}` });
  }

  res.json({ level: entry.level, lesson: entry.lesson, words: entry.words });
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SmartSpeech Backend running at http://localhost:${PORT}`);
});
