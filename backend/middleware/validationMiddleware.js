// backend/middleware/validationMiddleware.js
import Joi from 'joi';

// CSRF protection header validation
export const validateCSRFToken = (req, res, next) => {
  // In production, enforce CSRF protection for write operations
  if (process.env.NODE_ENV === 'production' && 
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    
    const csrfToken = req.headers['x-csrf-token'] || req.headers['x-requested-with'];
    
    // Allow XMLHttpRequest header (AJAX requests)
    // or custom CSRF token header
    if (!csrfToken && req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      return res.status(403).json({ 
        error: 'CSRF protection: Missing required headers for write operation',
        code: 'CSRF_TOKEN_MISSING'
      });
    }
  }
  
  next();
};

// Generic validation middleware factory
export const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const data = target === 'body' ? req.body : 
                 target === 'query' ? req.query : 
                 target === 'params' ? req.params : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      allowUnknown: false // Don't allow fields not in schema
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // Replace original data with validated/sanitized version
    if (target === 'body') req.body = value;
    else if (target === 'query') req.query = value;
    else if (target === 'params') req.params = value;

    next();
  };
};

// Common validation schemas
export const schemas = {
  // User authentication
  login: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(6).max(128).required()
  }),

  register: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .message('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  }),

  // Admin operations
  updateUserRole: Joi.object({
    role: Joi.string().valid('user', 'power_user', 'admin').required()
  }),

  updateUserStatus: Joi.object({
    isActive: Joi.boolean().required()
  }),

  // Search and filtering
  searchQuery: Joi.object({
    term: Joi.string().max(100).pattern(/^[a-zA-Z0-9\s\-_.]+$/)
      .message('Search term contains invalid characters'),
    limit: Joi.number().integer().min(1).max(100).default(50)
  }),

  // Report generation
  reportRequest: Joi.object({
    timePeriod: Joi.string().valid('current_month', 'last_30_days', 'last_90_days').required(),
    forceRefresh: Joi.boolean().default(false)
  }),

  // Store filtering
  storeFilters: Joi.object({
    region: Joi.string().max(50),
    mixedBeverage: Joi.string().valid('yes', 'no', 'all'),
    deliveryDay: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    search: Joi.string().max(100)
  }),

  // Email verification
  emailVerification: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().length(6).pattern(/^\d+$/).required()
  }),

  // Password reset
  passwordReset: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  }),

  // Generic ID parameter (accepts either 'id' or 'userId')
  idParam: Joi.object({
    id: Joi.number().integer().positive(),
    userId: Joi.number().integer().positive()
  }).or('id', 'userId')
};

// Rate limiting bypass for internal requests
export const skipRateLimitForInternal = (req, res, next) => {
  // Skip rate limiting for requests from internal services
  const userAgent = req.headers['user-agent'];
  const isInternalRequest = userAgent && (
    userAgent.includes('internal-service') ||
    userAgent.includes('python-reports') ||
    userAgent.includes('warehouse-generator')
  );

  if (isInternalRequest) {
    req.skipRateLimit = true;
  }

  next();
};

export default {
  validate,
  validateCSRFToken,
  skipRateLimitForInternal,
  schemas
};