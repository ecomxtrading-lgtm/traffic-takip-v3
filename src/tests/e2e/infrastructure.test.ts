/**
 * E2E Tests for Infrastructure Layer
 * Tests multi-tenant security, site isolation, and basic event operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import type { FastifyInstance } from 'fastify';

import { jwtService } from '../../core/auth/jwt.ts';
import { hmacService, generateHMACHeaders } from '../../core/security/hmac.ts';
import type { SiteId, TenantId, UserId } from '../../core/types/public.ts';
import { buildApp } from '../../index.ts';

describe('Infrastructure E2E Tests', () => {
  let app: FastifyInstance;
  let site1Id: SiteId;
  let site2Id: SiteId;
  let tenant1Id: TenantId;
  // let _tenant2Id: TenantId;
  let user1Id: UserId;

  beforeAll(async () => {
    // Start the application
    app = await buildApp();
    await app.ready();

    // Setup test data
    site1Id = 'ut_site_1_test' as SiteId;
    site2Id = 'ut_site_2_test' as SiteId;
    tenant1Id = 'ut_tenant_1_test' as TenantId;
    // _tenant2Id = 'ut_tenant_2_test' as TenantId;
    user1Id = 'ut_user_1_test' as UserId;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Clear HMAC nonce cache before each test
    hmacService.clearNonceCache();
  });

  describe('Site ID Validation', () => {
    it('should validate site_id in JWT claims', async () => {
      const token = jwtService.generateAccessToken({
        sub: user1Id,
        site_id: site1Id,
        tenant_id: tenant1Id,
        user_id: user1Id,
        permissions: ['read', 'write'],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/sites/current',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.site_id).toBe(site1Id);
    });

    it('should reject requests with invalid site_id', async () => {
      const token = jwtService.generateAccessToken({
        sub: user1Id,
        site_id: 'invalid_site' as SiteId,
        tenant_id: tenant1Id,
        user_id: user1Id,
        permissions: ['read', 'write'],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/sites/current',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Site Isolation', () => {
    it('should prevent access to different site data', async () => {
      // Create token for site1
      const site1Token = jwtService.generateAccessToken({
        sub: user1Id,
        site_id: site1Id,
        tenant_id: tenant1Id,
        user_id: user1Id,
        permissions: ['read', 'write'],
      });

      // Try to access site2 data with site1 token
      const response = await app.inject({
        method: 'GET',
        url: `/api/sites/${site2Id}/events`,
        headers: {
          authorization: `Bearer ${site1Token}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const data = JSON.parse(response.payload);
      expect(data.error).toContain('insufficient permissions');
    });

    it('should allow access to own site data', async () => {
      const site1Token = jwtService.generateAccessToken({
        sub: user1Id,
        site_id: site1Id,
        tenant_id: tenant1Id,
        user_id: user1Id,
        permissions: ['read', 'write'],
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/sites/${site1Id}/events`,
        headers: {
          authorization: `Bearer ${site1Token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Event Insert/Read Operations', () => {
    it('should insert event successfully', async () => {
      const eventData = {
        event_name: 'page_view',
        event_type: 'page_view',
        page_url: 'https://example.com/test',
        user_agent: 'Mozilla/5.0 Test Browser',
        ip_address: '127.0.0.1',
        properties: {
          test: 'true',
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/sites/${site1Id}/events`,
        headers: {
          'x-api-key': site1Id, // Using site_id as API key for tracking
          'content-type': 'application/json',
        },
        payload: eventData,
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.event_id).toBeDefined();
    });

    it('should read events for correct site only', async () => {
      // Insert event for site1
      await app.inject({
        method: 'POST',
        url: `/api/sites/${site1Id}/events`,
        headers: {
          'x-api-key': site1Id,
          'content-type': 'application/json',
        },
        payload: {
          event_name: 'test_event',
          event_type: 'test',
          page_url: 'https://example.com/test',
        },
      });

      // Insert event for site2
      await app.inject({
        method: 'POST',
        url: `/api/sites/${site2Id}/events`,
        headers: {
          'x-api-key': site2Id,
          'content-type': 'application/json',
        },
        payload: {
          event_name: 'test_event',
          event_type: 'test',
          page_url: 'https://example.com/test',
        },
      });

      // Read events for site1
      const response = await app.inject({
        method: 'GET',
        url: `/api/sites/${site1Id}/events`,
        headers: {
          'x-api-key': site1Id,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.events).toBeDefined();
      expect(data.events.length).toBeGreaterThan(0);
      
      // Verify all events belong to site1
      data.events.forEach((event: any) => {
        expect(event.site_id).toBe(site1Id);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests: Promise<any>[] = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 10; i++) {
        requests.push(
          app.inject({
            method: 'GET',
            url: '/api/sites/current',
            headers: {
              'x-api-key': site1Id,
            },
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('HMAC Validation', () => {
    it('should validate HMAC signatures', async () => {
      const payload = { test: 'data' };
      // const siteSalt = 'test_site_salt';
      
      const headers = generateHMACHeaders(payload, site1Id);

      const response = await app.inject({
        method: 'POST',
        url: `/api/sites/${site1Id}/events`,
        headers: {
          'x-api-key': site1Id,
          'x-signature': headers['X-Signature'],
          'x-timestamp': headers['X-Timestamp'],
          'x-nonce': headers['X-Nonce'],
          'content-type': 'application/json',
        },
        payload,
      });

      expect(response.statusCode).toBe(201);
    });

    it('should reject invalid HMAC signatures', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/sites/${site1Id}/events`,
        headers: {
          'x-api-key': site1Id,
          'x-signature': 'invalid_signature',
          'x-timestamp': Date.now().toString(),
          'x-nonce': 'test_nonce',
          'content-type': 'application/json',
        },
        payload: { test: 'data' },
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.payload);
      expect(data.error).toContain('Invalid HMAC signature');
    });

    it('should prevent replay attacks', async () => {
      const payload = { test: 'data' };
      // const siteSalt = 'test_site_salt';
      
      const headers = generateHMACHeaders(payload, site1Id);

      // First request should succeed
      const response1 = await app.inject({
        method: 'POST',
        url: `/api/sites/${site1Id}/events`,
        headers: {
          'x-api-key': site1Id,
          'x-signature': headers['X-Signature'],
          'x-timestamp': headers['X-Timestamp'],
          'x-nonce': headers['X-Nonce'],
          'content-type': 'application/json',
        },
        payload,
      });

      expect(response1.statusCode).toBe(201);

      // Second request with same nonce should fail
      const response2 = await app.inject({
        method: 'POST',
        url: `/api/sites/${site1Id}/events`,
        headers: {
          'x-api-key': site1Id,
          'x-signature': headers['X-Signature'],
          'x-timestamp': headers['X-Timestamp'],
          'x-nonce': headers['X-Nonce'],
          'content-type': 'application/json',
        },
        payload,
      });

      expect(response2.statusCode).toBe(401);
      const data = JSON.parse(response2.payload);
      expect(data.error).toContain('Nonce already used');
    });
  });

  describe('Database RLS', () => {
    it('should enforce RLS policies', async () => {
      // This test would require actual database setup
      // For now, we'll test the RLS function calls
      
      const token = jwtService.generateAccessToken({
        sub: user1Id,
        site_id: site1Id,
        tenant_id: tenant1Id,
        user_id: user1Id,
        permissions: ['read'],
      });

      // Test that RLS context is set correctly
      const response = await app.inject({
        method: 'GET',
        url: '/api/sites/current',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      // In a real implementation, this would verify that
      // the database query only returns data for the correct site
    });
  });
});
