/**
 * File Upload Validation Middleware
 * Validates file types, sizes, and provides security checks
 */

import path from 'path';

// Allowed MIME types by category
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  videos: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ],
};

// Allowed extensions by category
const ALLOWED_EXTENSIONS = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  videos: ['.mp4', '.mov', '.webm', '.avi'],
  audio: ['.mp3', '.wav', '.ogg'],
  documents: ['.pdf', '.doc', '.docx', '.txt', '.md'],
};

// File size limits by category (in bytes)
const SIZE_LIMITS = {
  images: 10 * 1024 * 1024, // 10MB
  videos: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024, // 50MB
  documents: 20 * 1024 * 1024, // 20MB
  default: 10 * 1024 * 1024, // 10MB
};

// Get all allowed MIME types
const getAllAllowedTypes = () => {
  return Object.values(ALLOWED_TYPES).flat();
};

// Get all allowed extensions
const getAllAllowedExtensions = () => {
  return Object.values(ALLOWED_EXTENSIONS).flat();
};

// Get file category from MIME type
const getFileCategory = (mimetype) => {
  for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
    if (types.includes(mimetype)) {
      return category;
    }
  }
  return null;
};

// Validate file type
export const validateFileType = (file, allowedCategories = null) => {
  const allTypes = getAllAllowedTypes();
  const allExtensions = getAllAllowedExtensions();

  // Check MIME type
  if (!allTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Ungültiger Dateityp: ${file.mimetype}. Erlaubt sind: ${allExtensions.join(', ')}`,
    };
  }

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Ungültige Dateiendung: ${ext}. Erlaubt sind: ${allExtensions.join(', ')}`,
    };
  }

  // Check category if specified
  if (allowedCategories) {
    const category = getFileCategory(file.mimetype);
    if (!allowedCategories.includes(category)) {
      return {
        valid: false,
        error: `Dateikategorie nicht erlaubt. Erlaubt sind: ${allowedCategories.join(', ')}`,
      };
    }
  }

  return { valid: true };
};

// Validate file size
export const validateFileSize = (file) => {
  const category = getFileCategory(file.mimetype);
  const maxSize = SIZE_LIMITS[category] || SIZE_LIMITS.default;

  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `Datei zu groß (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximal erlaubt: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};

// Sanitize filename
export const sanitizeFilename = (filename) => {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  // Remove special characters except .-_
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Ensure it doesn't start with a dot (hidden files)
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized.slice(1);
  }
  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    sanitized = sanitized.slice(0, 255 - ext.length) + ext;
  }
  return sanitized;
};

// Express middleware for file validation
export const fileValidationMiddleware = (allowedCategories = null) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || (req.file ? [req.file] : []);

    for (const file of files) {
      // Validate type
      const typeValidation = validateFileType(file, allowedCategories);
      if (!typeValidation.valid) {
        return res.status(400).json({ error: typeValidation.error });
      }

      // Validate size
      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.valid) {
        return res.status(400).json({ error: sizeValidation.error });
      }

      // Sanitize filename
      file.originalname = sanitizeFilename(file.originalname);
    }

    next();
  };
};

// Multer file filter function
export const createFileFilter = (allowedCategories = null) => {
  return (req, file, cb) => {
    const validation = validateFileType(file, allowedCategories);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error), false);
    }
  };
};

export default {
  validateFileType,
  validateFileSize,
  sanitizeFilename,
  fileValidationMiddleware,
  createFileFilter,
  ALLOWED_TYPES,
  ALLOWED_EXTENSIONS,
  SIZE_LIMITS,
};
