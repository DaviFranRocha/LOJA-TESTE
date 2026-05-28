const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const AppError = require('../utils/AppError');
const { protect } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Check if Cloudinary is properly configured
let useCloudinary = false;
let cloudinary    = null;
try {
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'seu_cloud_name' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    useCloudinary = true;
  }
} catch (e) { /* Cloudinary not configured */ }

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new AppError('Formato não suportado. Use JPG, PNG ou WEBP.', 400));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.post('/image', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('Nenhuma imagem enviada', 400));

    // ── Cloudinary upload (if configured) ─────────────────────
    if (useCloudinary && cloudinary) {
      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'francisco-store',
              transformation: [{ quality: 'auto:good', fetch_format: 'auto', width: 1200, crop: 'limit' }],
            },
            (error, result) => error ? reject(error) : resolve(result)
          );
          stream.end(req.file.buffer);
        });
        return res.json({
          success: true,
          data: { url: result.secure_url, publicId: result.public_id, source: 'cloudinary' }
        });
      } catch (err) {
        console.error('Cloudinary error, falling back to local:', err.message);
      }
    }

    // ── Local save fallback ────────────────────────────────────
    const ext      = path.extname(req.file.originalname || '.jpg').toLowerCase() || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, req.file.buffer);

    // Return a path accessible via /api/upload/files/filename
    const host     = `${req.protocol}://${req.get('host')}`;
    const fileUrl  = `${host}/api/upload/files/${filename}`;

    res.json({
      success: true,
      data: { url: fileUrl, publicId: filename, source: 'local' }
    });
  } catch (err) { next(err); }
});

// Serve uploaded files
router.use('/files', express.static(uploadsDir));

module.exports = router;
