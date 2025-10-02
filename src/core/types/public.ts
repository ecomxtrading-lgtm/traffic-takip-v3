/**
 * Public types - Dışa açık DTO'lar ve tipler
 * Bu dosya tüm modüller tarafından import edilebilir
 */

// Core identifiers
export type TenantId = string;
export type UserId = string;
export type SessionId = string;
export type EventId = string;
export type SiteId = string;

// Event names
export type EventName = string;

// Consent state
export type ConsentState = 'granted' | 'denied' | 'pending';

// Timestamps
export type Timestamp = number; // Unix timestamp in milliseconds
export type ISODateString = string; // ISO 8601 date string

// Common response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Timestamp;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Request context
export interface RequestContext {
  tenantId: TenantId;
  siteId: SiteId;
  userId?: UserId;
  sessionId?: SessionId;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Timestamp;
}

// Common tracking data
export interface TrackingData {
  siteId: SiteId;
  userId?: UserId;
  sessionId?: SessionId;
  timestamp: Timestamp;
  consent: ConsentState;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

// Device information
export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screenResolution?: {
    width: number;
    height: number;
  };
  viewportSize?: {
    width: number;
    height: number;
  };
}

// Geographic information
export interface GeoInfo {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
}

// Performance metrics
export interface PerformanceMetrics {
  pageLoadTime?: number;
  domContentLoaded?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
}

// E-commerce types
export interface Product {
  id: string;
  name: string;
  category?: string;
  brand?: string;
  price: number;
  currency: string;
  quantity?: number;
  variant?: string;
  sku?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  total: number;
  currency: string;
  items: CartItem[];
  discount?: number;
  tax?: number;
  shipping?: number;
}

// Meta CAPI types
export interface MetaCapiEvent {
  event_name: string;
  event_time: number;
  user_data: {
    em?: string; // hashed email
    ph?: string; // hashed phone
    fn?: string; // hashed first name
    ln?: string; // hashed last name
    ct?: string; // hashed city
    st?: string; // hashed state
    zp?: string; // hashed zip code
    country?: string; // hashed country
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string; // Facebook click ID
    fbp?: string; // Facebook browser ID
  };
  custom_data?: {
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    contents?: Array<{
      id: string;
      quantity: number;
      item_price: number;
    }>;
    value?: number;
    currency?: string;
    num_items?: number;
  };
  event_source_url?: string;
  action_source: 'website' | 'app';
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Timestamp;
  services: {
    database: 'up' | 'down' | 'degraded';
    redis: 'up' | 'down' | 'degraded';
    clickhouse: 'up' | 'down' | 'degraded';
  };
  uptime: number;
  version: string;
}
