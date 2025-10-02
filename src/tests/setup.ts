/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Set test environment variables before any modules are loaded
process.env.NODE_ENV = 'test';
process.env.SITE_SALT = 'test-site-salt-123456789012345678901234567890';
process.env.JWT_SECRET = 'test-jwt-secret-123456789012345678901234567890';
process.env.HMAC_SECRET = 'test-hmac-secret-123456789012345678901234567890';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
