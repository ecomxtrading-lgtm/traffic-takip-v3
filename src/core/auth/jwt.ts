/**
 * JWT Authentication and Authorization
 * Multi-tenant JWT handling with site_id claims
 */

import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import type { TenantId, SiteId, UserId } from '../types/public.js';

export interface JWTPayload {
  // Standard claims
  sub: string; // user_id or api_key
  iat: number; // issued at
  exp: number; // expires at
  iss: string; // issuer
  
  // Custom claims for multi-tenancy
  site_id: SiteId;
  tenant_id: TenantId;
  user_id?: UserId | undefined;
  api_key?: string | undefined;
  
  // Permissions
  permissions: string[];
  
  // Session info
  session_id?: string | undefined;
  ip_address?: string | undefined;
  user_agent?: string | undefined;
}

export interface JWTRefreshPayload {
  sub: string;
  site_id: SiteId;
  tenant_id: TenantId;
  type: 'refresh';
  iat: number;
  exp: number;
}

/**
 * JWT Service for token management
 */
export class JWTService {
  private readonly secret: string;
  private readonly refreshSecret: string;
  private readonly issuer: string;

  constructor() {
    this.secret = env.JWT_SECRET;
    this.refreshSecret = `${env.JWT_SECRET  }_refresh`;
    this.issuer = 'universal-tracking';
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss'>): string {
    const now = Math.floor(Date.now() / 1000);
    
    const tokenPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + (15 * 60), // 15 minutes
      iss: this.issuer,
    };

    return jwt.sign(tokenPayload, this.secret, {
      algorithm: 'HS256',
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(
    userId: string,
    siteId: SiteId,
    tenantId: TenantId
  ): string {
    const now = Math.floor(Date.now() / 1000);
    
    const payload: JWTRefreshPayload = {
      sub: userId,
      site_id: siteId,
      tenant_id: tenantId,
      type: 'refresh',
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 days
    };

    return jwt.sign(payload, this.refreshSecret, {
      algorithm: 'HS256',
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: this.issuer,
      }) as JWTPayload;

      // Validate required claims
      if (!payload.site_id || !payload.tenant_id) {
        throw new Error('Invalid token: missing site_id or tenant_id');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JWTRefreshPayload {
    try {
      const payload = jwt.verify(token, this.refreshSecret, {
        algorithms: ['HS256'],
      }) as JWTRefreshPayload;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1] || null;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return true;
      }
      
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return null;
      }
      
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}

/**
 * Global JWT service instance
 */
export const jwtService = new JWTService();

/**
 * Middleware helper for extracting JWT from request
 */
export function extractJWTFromRequest(authHeader: string | undefined): JWTPayload | null {
  try {
    const token = jwtService.extractTokenFromHeader(authHeader);
    if (!token) {
      return null;
    }

    return jwtService.verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Permission checking utilities
 */
export class PermissionChecker {
  /**
   * Check if user has specific permission
   */
  static hasPermission(payload: JWTPayload, permission: string): boolean {
    return payload.permissions.includes(permission) || 
           payload.permissions.includes('*'); // Admin permission
  }

  /**
   * Check if user can access specific site
   */
  static canAccessSite(payload: JWTPayload, siteId: SiteId): boolean {
    return payload.site_id === siteId;
  }

  /**
   * Check if user can access specific tenant
   */
  static canAccessTenant(payload: JWTPayload, tenantId: TenantId): boolean {
    return payload.tenant_id === tenantId;
  }

  /**
   * Validate site access for API requests
   */
  static validateSiteAccess(payload: JWTPayload, requestedSiteId: SiteId): void {
    if (!this.canAccessSite(payload, requestedSiteId)) {
      throw new Error('Access denied: insufficient permissions for this site');
    }
  }
}
