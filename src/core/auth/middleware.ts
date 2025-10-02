/**
 * Authentication and Authorization Middleware
 * Fastify middleware for JWT validation and RLS setup
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

import type { SiteId, TenantId } from '../types/public.js';

import { extractJWTFromRequest, PermissionChecker } from './jwt.js';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    site_id: SiteId;
    tenant_id: TenantId;
    user_id?: string;
    permissions: string[];
    session_id?: string;
  };
}

/**
 * JWT Authentication Middleware
 * Validates JWT token and adds user info to request
 */
export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    const payload = extractJWTFromRequest(authHeader);

    if (!payload) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Add user info to request
    request.user = {
      site_id: payload.site_id,
      tenant_id: payload.tenant_id,
      permissions: payload.permissions,
      ...(payload.user_id && { user_id: payload.user_id }),
      ...(payload.session_id && { session_id: payload.session_id }),
    };

    // Set site_id for RLS
    await setSiteIdForRLS(payload.site_id);

  } catch (error) {
    request.log.error({ error }, 'Authentication failed');
    
    return reply.status(401).send({
      success: false,
      error: 'Invalid authentication token',
      code: 'AUTH_INVALID',
    });
  }
}

/**
 * Optional Authentication Middleware
 * Validates JWT if present, but doesn't require it
 */
export async function optionalAuthMiddleware(
  request: AuthenticatedRequest
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    const payload = extractJWTFromRequest(authHeader);

    if (payload) {
      request.user = {
        site_id: payload.site_id,
        tenant_id: payload.tenant_id,
        permissions: payload.permissions,
        ...(payload.user_id && { user_id: payload.user_id }),
        ...(payload.session_id && { session_id: payload.session_id }),
      };

      // Set site_id for RLS if authenticated
      await setSiteIdForRLS(payload.site_id);
    }
  } catch (error) {
    request.log.warn({ error }, 'Optional authentication failed');
    // Don't throw error for optional auth
  }
}

/**
 * Site Access Validation Middleware
 * Ensures user can only access their own site data
 */
export function createSiteAccessMiddleware(requiredSiteId?: SiteId) {
  return async function siteAccessMiddleware(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Get site_id from URL params or body
    const requestedSiteId = requiredSiteId || 
                           (request.params as any)?.site_id ||
                           (request.body as any)?.site_id;

    if (!requestedSiteId) {
      return reply.status(400).send({
        success: false,
        error: 'Site ID is required',
        code: 'SITE_ID_REQUIRED',
      });
    }

    try {
      // Convert request.user to JWTPayload format for validation
      const userPayload = {
        sub: request.user.user_id || 'unknown',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iss: 'universal-tracking',
        site_id: request.user.site_id,
        tenant_id: request.user.tenant_id,
        user_id: request.user.user_id,
        permissions: request.user.permissions,
        session_id: request.user.session_id,
      };
      
      // Validate site access
      PermissionChecker.validateSiteAccess(userPayload, requestedSiteId);
    } catch (error) {
      return reply.status(403).send({
        success: false,
        error: 'Access denied: insufficient permissions for this site',
        code: 'SITE_ACCESS_DENIED',
      });
    }
  };
}

/**
 * Permission-based Authorization Middleware
 */
export function createPermissionMiddleware(requiredPermissions: string[]) {
  return async function permissionMiddleware(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Convert request.user to JWTPayload format for validation
    const userPayload = {
      sub: request.user.user_id || 'unknown',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iss: 'universal-tracking',
      site_id: request.user.site_id,
      tenant_id: request.user.tenant_id,
      user_id: request.user.user_id,
      permissions: request.user.permissions,
      session_id: request.user.session_id,
    };

    // Check if user has required permissions
    const hasAllPermissions = requiredPermissions.every(permission =>
      PermissionChecker.hasPermission(userPayload, permission)
    );

    if (!hasAllPermissions) {
      return reply.status(403).send({
        success: false,
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        required: requiredPermissions,
      });
    }
  };
}

/**
 * API Key Authentication Middleware
 * For tracking API requests
 */
export async function apiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const apiKey = request.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return reply.status(401).send({
        success: false,
        error: 'API key required',
        code: 'API_KEY_REQUIRED',
      });
    }

    // TODO: Validate API key against database
    // For now, we'll extract site_id from a mock validation
    const siteId = await validateApiKey(apiKey);
    
    if (!siteId) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid API key',
        code: 'API_KEY_INVALID',
      });
    }

    // Set site_id for RLS
    await setSiteIdForRLS(siteId);

    // Add site info to request
    (request as any).site_id = siteId;

  } catch (error) {
    request.log.error({ error }, 'API key validation failed');
    
    return reply.status(401).send({
      success: false,
      error: 'API key validation failed',
      code: 'API_KEY_VALIDATION_ERROR',
    });
  }
}

/**
 * Set site_id for PostgreSQL RLS
 * This function will be called to set the current site_id in the database session
 */
async function setSiteIdForRLS(siteId: SiteId): Promise<void> {
  // TODO: Implement database connection and RLS setup
  // This would typically involve:
  // 1. Getting a database connection
  // 2. Calling the set_current_site_id() function
  // 3. Ensuring the connection is used for subsequent queries
  
  // For now, we'll store it in a request-scoped variable
  // In a real implementation, this would be handled by the database client
  console.log(`Setting site_id for RLS: ${siteId}`);
}

/**
 * Validate API key and return site_id
 * TODO: Implement actual database lookup
 */
async function validateApiKey(apiKey: string): Promise<SiteId | null> {
  // TODO: Implement actual API key validation
  // This should:
  // 1. Look up the API key in the sites table
  // 2. Verify the site is active
  // 3. Return the site_id if valid
  
  // Mock implementation for now
  if (apiKey.startsWith('ut_')) {
    return apiKey as SiteId;
  }
  
  return null;
}

/**
 * Clear RLS context (for logout)
 */
export async function clearRLSContext(): Promise<void> {
  // TODO: Implement RLS context clearing
  // This would call the clear_current_site_id() function
  console.log('Clearing RLS context');
}