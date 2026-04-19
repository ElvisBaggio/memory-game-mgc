const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Data directory (supports Docker volume via DATA_DIR env) ──
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Ensure uploads dir exists ──
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Config file path ──
const CONFIG_FILE = path.join(DATA_DIR, 'game-config.json');

// ── Multer storage: save to /uploads with unique names ──
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Use: jpg, png, gif, webp ou svg'));
    }
  }
});

// ── Middleware ──
app.use(express.json());

// ── Serve static files ──
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// ═══════════════════════════════════════
//   API ROUTES
// ═══════════════════════════════════════

// POST /api/upload — Upload an image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  res.json({
    success: true,
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`
  });
});

// GET /api/uploads — List all uploaded images
app.get('/api/uploads', (_req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
      .map(f => ({
        filename: f,
        url: `/uploads/${f}`,
        size: fs.statSync(path.join(UPLOADS_DIR, f)).size
      }));
    res.json(files);
  } catch {
    res.json([]);
  }
});

// DELETE /api/uploads/:filename — Delete an uploaded image
app.delete('/api/uploads/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado' });
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
});

// GET /api/config — Load game config
app.get('/api/config', (_req, res) => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      res.json(data);
    } else {
      res.json(null);
    }
  } catch {
    res.json(null);
  }
});

// POST /api/config — Save game config
app.post('/api/config', (req, res) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

// GET /api/version — Current deployed version
app.get('/api/version', (_req, res) => {
  try {
    const v = fs.readFileSync(path.join(__dirname, '.version'), 'utf8').trim();
    res.json({ version: v });
  } catch {
    res.json({ version: 'dev' });
  }
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`\n  🎮 Jogo da Memória - Magalu Cloud`);
  console.log(`  ────────────────────────────────`);
  console.log(`  🌐 http://localhost:${PORT}\n`);
});
