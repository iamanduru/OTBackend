import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const { JWT_SECRET } = process.env;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment');
}

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Malformed authorization header' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET); // { userId, role, iat, exp }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Allow if user has ANY of the specified roles.
 * Use together with requireAuth, or call requireAuth internally if req.user is absent.
 */
export const allowRoles = (...roles) => (req, res, next) => {
  const proceed = () => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

  // If user not attached yet, run auth first
  if (!req.user) {
    return requireAuth(req, res, proceed);
  }
  return proceed();
};

/** Single-role convenience wrapper */
export const requireRole = (role) => allowRoles(role);

/** Optional auth: attaches req.user if a valid token is present; otherwise continues */
export const requireAuthOptional = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return next();

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    // ignore invalid/expired token in optional flow
  }
  next();
};
