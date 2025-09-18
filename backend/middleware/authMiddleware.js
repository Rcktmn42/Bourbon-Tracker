// backend/middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// Enhanced authentication supporting both Bearer tokens and cookies
export function authenticate(req, res, next) {
  let token = null;
  
  // Try Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
    req.authMethod = 'bearer';
  }
  
  // Fall back to HTTP-only cookie
  if (!token && req.cookies.token) {
    token = req.cookies.token;
    req.authMethod = 'cookie';
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_TOKEN',
      message: 'Provide token via Authorization header (Bearer) or cookie'
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    let errorMessage = 'Invalid or expired token';
    let errorCode = 'INVALID_TOKEN';
    
    if (err.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
      errorCode = 'EXPIRED_TOKEN';
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = 'Malformed token';
      errorCode = 'MALFORMED_TOKEN';
    }
    
    res.status(401).json({ 
      error: errorMessage,
      code: errorCode
    });
  }
}

// Role-based access control - require specific role
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_USER'
      });
    }
    
    if (req.user.role !== role) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${role}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: req.user.role,
        requiredRole: role
      });
    }
    next();
  };
}

// Role-based access control - require any of the specified roles
export function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_USER'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${roles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: req.user.role,
        requiredRoles: roles
      });
    }
    next();
  };
}

// Admin access (admin only)
export const requireAdmin = requireRole('admin');

// Power user access (admin or power_user)
export const requirePowerUser = requireAnyRole(['admin', 'power_user']);

// Any authenticated user
export const requireAuth = authenticate;

// Optional authentication (attach user if token present, but don't require it)
export function optionalAuth(req, res, next) {
  let token = null;
  
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    req.authMethod = 'bearer';
  }
  
  // Fall back to cookie
  if (!token && req.cookies.token) {
    token = req.cookies.token;
    req.authMethod = 'cookie';
  }

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
    } catch (err) {
      // Ignore token errors for optional auth
      req.user = null;
    }
  }
  
  next();
}
