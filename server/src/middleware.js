import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { User } from './models.js';

export function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function ok(res, data, message, status = 200) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  return res.status(status).json(body);
}

export function fail(res, status, message, errors) {
  return res.status(status).json({ success: false, message, errors });
}

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(res, 400, 'Check the highlighted fields and try again.', errors.array());
  }
  return next();
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

async function userFromToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) return null;
  if ((user.tokenVersion || 0) !== (decoded.tv || 0)) return null;
  if (user.isSuspended) {
    const error = new Error('This account is suspended. Contact the platform administrator.');
    error.status = 403;
    throw error;
  }
  return user;
}

export async function protect(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) return fail(res, 401, 'Sign in to continue.');
    const user = await userFromToken(token);
    if (!user) return fail(res, 401, 'Your session has ended. Sign in again.');
    req.user = user;
    return next();
  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    return fail(res, 401, 'Your session has ended. Sign in again.');
  }
}

export async function optionalProtect(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) return next();
    req.user = await userFromToken(token);
    return next();
  } catch {
    return next();
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, 'You do not have permission to do that.');
    }
    return next();
  };
}

export function sanitize(req, _res, next) {
  strip(req.body);
  strip(req.params);
  strip(req.query);
  next();
}

function strip(value) {
  if (Array.isArray(value)) {
    value.forEach(strip);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) delete value[key];
    else strip(value[key]);
  }
}

const hits = new Map();

export function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
    if (recent.length >= max) {
      return fail(res, 429, 'Too many attempts. Wait a few minutes and try again.');
    }
    recent.push(now);
    hits.set(key, recent);
    return next();
  };
}

export function errorHandler(err, _req, res, _next) {
  if (err?.name === 'ValidationError') {
    return fail(
      res,
      400,
      'Some details could not be saved.',
      Object.values(err.errors).map((item) => ({ msg: item.message, path: item.path }))
    );
  }
  if (err?.name === 'CastError') return fail(res, 400, 'That record id is not valid.');
  if (err?.code === 11000) return fail(res, 409, 'A record with those details already exists.');
  if (err?.code === 'LIMIT_FILE_SIZE') return fail(res, 400, 'Images must be 5MB or smaller.');
  const status = err.status || 500;
  if (status === 500) console.error(err);
  return fail(res, status, status === 500 ? 'Something went wrong on the server.' : err.message);
}
