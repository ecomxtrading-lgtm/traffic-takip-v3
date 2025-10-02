# Railway Deploy Rehberi

## 1. Railway CLI Kurulumu
```bash
npm install -g @railway/cli
```

## 2. Railway'e Giriş
```bash
railway login
```

## 3. Proje Oluştur
```bash
railway init
```

## 4. PostgreSQL Addon Ekle
```bash
railway add postgresql
```

## 5. Redis Addon Ekle
```bash
railway add redis
```

## 6. Environment Variables Set Et
```bash
# Security keys
railway variables set SITE_SALT="your-production-salt-here"
railway variables set JWT_SECRET="your-production-jwt-secret-here"
railway variables set HMAC_SECRET="your-production-hmac-secret-here"

# ClickHouse (external)
railway variables set CLICKHOUSE_HOST="your-clickhouse-host"
railway variables set CLICKHOUSE_PASSWORD="your-clickhouse-password"

# External services
railway variables set GEOIP_API_KEY="your-geoip-api-key"
railway variables set META_APP_ID="your-meta-app-id"
railway variables set META_APP_SECRET="your-meta-app-secret"
railway variables set META_ACCESS_TOKEN="your-meta-access-token"
```

## 7. Deploy Et
```bash
railway up
```

## 8. Domain Ayarla
```bash
railway domain
```

## 9. Logları İzle
```bash
railway logs
```

## 10. Status Kontrol
```bash
railway status
```

## Önemli Notlar

1. **PostgreSQL ve Redis** Railway addon'ları otomatik olarak environment variable'ları set eder
2. **ClickHouse** external service olduğu için manuel olarak host ve password set etmeniz gerekir
3. **Security keys** production için güçlü değerler kullanın
4. **Domain** Railway otomatik olarak verir, custom domain de ekleyebilirsiniz
5. **Health check** `/api/v1/health` endpoint'ini kullanır

## Troubleshooting

- **Build hatası**: `railway logs` ile logları kontrol edin
- **Environment variables**: `railway variables` ile kontrol edin
- **Database bağlantısı**: PostgreSQL addon'unun çalıştığından emin olun
- **Redis bağlantısı**: Redis addon'unun çalıştığından emin olun
