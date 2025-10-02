/**
 * HMAC Security Service
 * Request signing and replay protection
 */

import { createHmac, timingSafeEqual } from 'crypto';

import type { FastifyReply } from 'fastify';

import { env } from '../config/env.js';
import type { SiteId } from '../types/public.js';
import type { ExtendedFastifyRequest } from '../types/internal.js';

export interface HMACConfig {
  algorithm: string;
  encoding: 'hex' | 'base64';
  maxAge: number; // Maximum age in milliseconds
}

export interface SignedRequest {
  signature: string;
  timestamp: number;
  nonce: string;
  payload: string;
}

export interface HMACValidationResult {
  valid: boolean;
  error?: string;
  age?: number;
}

export class HMACService {
  private readonly secret: string;
  private readonly config: HMACConfig;
  private readonly nonceCache = new Set<string>();

  constructor(secret: string, config: HMACConfig = {
    algorithm: 'sha256',
    encoding: 'hex',
    maxAge: 300000, // 5 minutes
  }) {
    this.secret = secret;
    this.config = config;
  }

  /**
   * Sign a request payload
   */
  sign(payload: string, siteId: SiteId): SignedRequest {
    const timestamp = Date.now();
    const nonce = this.generateNonce();
    const message = this.createMessage(payload, timestamp, nonce, siteId);
    const signature = this.createSignature(message);

    return {
      signature,
      timestamp,
      nonce,
      payload,
    };
  }

  /**
   * Verify a signed request
   */
  verify(
    signedRequest: SignedRequest,
    siteId: SiteId,
    siteSalt: string
  ): HMACValidationResult {
    try {
      // Check timestamp (replay protection)
      const age = Date.now() - signedRequest.timestamp;
      if (age > this.config.maxAge) {
        return {
          valid: false,
          error: 'Request too old',
          age,
        };
      }

      // Check nonce (replay protection)
      if (this.nonceCache.has(signedRequest.nonce)) {
        return {
          valid: false,
          error: 'Nonce already used',
        };
      }

      // Verify signature
      const message = this.createMessage(
        signedRequest.payload,
        signedRequest.timestamp,
        signedRequest.nonce,
        siteId
      );
      
      const expectedSignature = this.createSignature(message, siteSalt);
      const providedSignature = Buffer.from(signedRequest.signature, this.config.encoding);
      const expectedBuffer = Buffer.from(expectedSignature, this.config.encoding);

      if (!timingSafeEqual(providedSignature, expectedBuffer)) {
        return {
          valid: false,
          error: 'Invalid signature',
        };
      }

      // Add nonce to cache
      this.nonceCache.add(signedRequest.nonce);

      // Clean old nonces periodically
      this.cleanupNonces();

      return {
        valid: true,
        age,
      };

    } catch (error) {
      return {
        valid: false,
        error: `Verification failed: ${error}`,
      };
    }
  }

  /**
   * Create message for signing
   */
  private createMessage(
    payload: string,
    timestamp: number,
    nonce: string,
    siteId: SiteId
  ): string {
    return `${siteId}:${timestamp}:${nonce}:${payload}`;
  }

  /**
   * Create HMAC signature
   */
  private createSignature(message: string, siteSalt?: string): string {
    const secret = siteSalt ? `${this.secret}:${siteSalt}` : this.secret;
    const hmac = createHmac(this.config.algorithm, secret);
    hmac.update(message);
    return hmac.digest(this.config.encoding);
  }

  /**
   * Generate unique nonce
   */
  private generateNonce(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old nonces from cache
   */
  private cleanupNonces(): void {
    // Keep only last 1000 nonces to prevent memory leak
    if (this.nonceCache.size > 1000) {
      const nonces = Array.from(this.nonceCache);
      this.nonceCache.clear();
      
      // Keep only the most recent 500 nonces
      nonces
        .sort((a, b) => {
          const timestampA = parseInt(a.split('-')[0] || '0');
          const timestampB = parseInt(b.split('-')[0] || '0');
          return timestampB - timestampA;
        })
        .slice(0, 500)
        .forEach(nonce => this.nonceCache.add(nonce));
    }
  }

  /**
   * Clear nonce cache (for testing)
   */
  clearNonceCache(): void {
    this.nonceCache.clear();
  }
}

/**
 * Global HMAC service instance
 */
export const hmacService = new HMACService(env.HMAC_SECRET);

/**
 * HMAC middleware for Fastify
 */
export function createHMACMiddleware() {
  return async function hmacMiddleware(
    request: ExtendedFastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Skip HMAC for certain endpoints
      const skipPaths = ['/health', '/ready', '/metrics'];
      if (request.url && skipPaths.includes(request.url.split('?')[0] || '')) {
        return;
      }

      const signature = request.headers['x-signature'] as string;
      const timestamp = request.headers['x-timestamp'] as string;
      const nonce = request.headers['x-nonce'] as string;

      if (!signature || !timestamp || !nonce) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required HMAC headers',
          code: 'HMAC_HEADERS_MISSING',
        });
      }

      // Get site information
      const siteId = request.site_id || request.user?.siteId;
      if (!siteId) {
        return reply.status(400).send({
          success: false,
          error: 'Site ID required for HMAC validation',
          code: 'SITE_ID_REQUIRED',
        });
      }

      // TODO: Get site salt from database
      const siteSalt = await getSiteSalt(siteId);
      if (!siteSalt) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid site ID',
          code: 'SITE_ID_INVALID',
        });
      }

      // Create signed request object
      const signedRequest: SignedRequest = {
        signature,
        timestamp: parseInt(timestamp),
        nonce,
        payload: JSON.stringify(request.body || {}),
      };

      // Verify HMAC
      const result = hmacService.verify(signedRequest, siteId, siteSalt);

      if (!result.valid) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid HMAC signature',
          code: 'HMAC_INVALID',
          details: result.error,
        });
      }

      // Add HMAC info to request
      request.hmac = {
        valid: true,
        ...(result.age !== undefined && { age: result.age }),
        nonce: signedRequest.nonce,
      };

    } catch (error) {
      request.log.error({ error }, 'HMAC validation failed');
      
      return reply.status(500).send({
        success: false,
        error: 'HMAC validation error',
        code: 'HMAC_VALIDATION_ERROR',
      });
    }
  };
}

/**
 * Get site salt from database
 * TODO: Implement actual database lookup
 */
async function getSiteSalt(siteId: SiteId): Promise<string | null> {
  // TODO: Implement actual database lookup
  // This should query the sites table for the site_salt field
  
  // Mock implementation for now
  if (siteId.startsWith('ut_')) {
    return `site_salt_${siteId}`;
  }
  
  return null;
}

/**
 * Generate HMAC headers for client requests
 */
export function generateHMACHeaders(
  payload: unknown,
  siteId: SiteId
): Record<string, string> {
  const signedRequest = hmacService.sign(JSON.stringify(payload), siteId);
  
  return {
    'X-Signature': signedRequest.signature,
    'X-Timestamp': signedRequest.timestamp.toString(),
    'X-Nonce': signedRequest.nonce,
  };
}
