// frontend/src/utils/api.js

/**
 * Enhanced fetch wrapper with CSRF protection headers
 * Automatically adds X-Requested-With header for production CSRF protection
 */
export const apiFetch = async (url, options = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Required for CSRF protection
  };

  // Merge headers, allowing caller to override
  const headers = {
    ...defaultHeaders,
    ...(options.headers || {}),
  };

  // Always include credentials for cookie-based auth
  const fetchOptions = {
    credentials: 'include',
    ...options,
    headers,
  };

  return fetch(url, fetchOptions);
};

export default apiFetch;
