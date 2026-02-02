/**
 * Rate Limiting Middleware
 * Protects against brute force attacks and API abuse
 */

import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window
  message: {
    error: 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.',
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per window
  message: {
    error: 'Zu viele Anmeldeversuche. Bitte warte 15 Minuten.',
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI/Chat rate limiter (more restrictive due to resource usage)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 AI requests per minute
  message: {
    error: 'Zu viele AI-Anfragen. Bitte warte einen Moment.',
    retryAfter: 1,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 uploads per hour
  message: {
    error: 'Zu viele Uploads. Bitte warte eine Stunde.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default apiLimiter;
