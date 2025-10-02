# Universal Tracking

**1st-party e-commerce tracking library** with modular architecture, designed for high-performance analytics and real-time metrics.

## 🎯 Features

- **1st-Party Data Collection**: Bypass ad-blockers with first-party cookies
- **Modular Architecture**: Module-within-module design for maintainability
- **Real-time Analytics**: ≤15s latency for live metrics
- **Multi-Database**: PostgreSQL (transactional), Redis (real-time), ClickHouse (OLAP)
- **Meta CAPI Integration**: Direct Facebook/Instagram conversion tracking
- **Privacy-First**: GDPR/CCPA compliant with consent management

## 🏗️ Architecture

```
PostgreSQL (Transactional) + Redis (Real-time) + ClickHouse (OLAP)
```

### Core Modules
- **Active Users**: Real-time presence tracking with EMA calculation
- **Sessions**: User session management and analytics
- **Page Analytics**: Page views, dwell time, attribution
- **E-commerce**: Product views, cart, checkout, purchase funnel
- **Device Intelligence**: User agent parsing, device detection
- **Geo & Time**: IP geolocation, timezone handling
- **Performance**: Web Vitals, Core Web Vitals tracking
- **Meta CAPI**: Facebook/Instagram conversion API integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- ClickHouse 22+

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd universal-tracking
pnpm install
```

2. **Environment setup**
```bash
cp env.example .env
# Edit .env with your database credentials
```

3. **Start development server**
```bash
pnpm dev
```

4. **Verify installation**
```bash
curl http://localhost:3000/health
```

## 📁 Project Structure

```
src/
├── core/                    # Core infrastructure
│   ├── di/                 # Dependency injection
│   ├── events/             # Event bus system
│   ├── config/             # Environment configuration
│   ├── http/               # Fastify server setup
│   └── types/              # Type definitions
├── tracking/               # Tracking modules
│   ├── active-users/       # Real-time user tracking
│   ├── sessions/           # Session management
│   ├── page-analytics/     # Page view analytics
│   ├── ecommerce/          # E-commerce tracking
│   ├── device-intel/       # Device detection
│   ├── geo-time/           # Geolocation & timezone
│   ├── performance/        # Performance metrics
│   └── meta-capi/          # Meta CAPI integration
├── types/                  # Shared type definitions
└── index.ts               # Application entry point
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `PG_HOST` | PostgreSQL host | `localhost` |
| `REDIS_HOST` | Redis host | `localhost` |
| `CLICKHOUSE_HOST` | ClickHouse host | `localhost` |
| `SITE_SALT` | Site-specific salt | **Required** |
| `JWT_SECRET` | JWT signing secret | **Required** |
| `HMAC_SECRET` | HMAC signing secret | **Required** |

See `env.example` for complete configuration options.

## 📊 API Endpoints

### Health & Monitoring
- `GET /health` - Health check
- `GET /ready` - Readiness check
- `GET /metrics` - Prometheus metrics

### Tracking (1st-Party)
- `POST /collect/*` - Event collection endpoints
- `GET /presence/stream` - Real-time presence stream (SSE)

## 🧪 Development

### Scripts
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
pnpm format       # Format code with Prettier
pnpm type-check   # TypeScript type checking
```

### Code Quality
- **ESLint**: Strict import rules, TypeScript best practices
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict mode with path mapping
- **Import Guards**: Module boundary enforcement

## 🏭 Production

### Docker
```bash
docker build -t universal-tracking .
docker run -p 3000:3000 universal-tracking
```

### Environment
- Use production-grade database configurations
- Enable SSL/TLS for all database connections
- Configure proper CORS origins
- Set up monitoring and alerting

## 📈 Performance

### Targets
- **Live Metrics**: ≤15s latency
- **ClickHouse Queries**: <2s (p95)
- **Dashboard TTFB**: <1.5s
- **Health Check**: <500ms

### Optimization
- Connection pooling for all databases
- Redis caching for hot data
- ClickHouse materialized views for rollups
- Event batching for Meta CAPI

## 🔒 Security

- HMAC signature verification
- Rate limiting (IP + site-based)
- CORS configuration
- PII hashing and encryption
- Consent-based data collection

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For questions and support, please open an issue on GitHub.
