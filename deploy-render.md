# Render Deploy Rehberi

## 🚀 Render ile Deploy

### 1. Render Hesabı Oluştur
1. https://render.com adresine git
2. "Get Started for Free" butonuna tıkla
3. GitHub hesabınla giriş yap

### 2. Repository'yi Bağla
1. Dashboard'da "New +" butonuna tıkla
2. "Web Service" seç
3. GitHub repository'ni seç: `HuralOmer/traffic-takip-v3`
4. "Connect" butonuna tıkla

### 3. Web Service Ayarları
```
Name: traffic-takip-app
Environment: Node
Region: Oregon (US West)
Branch: main
Root Directory: (boş bırak)
Build Command: pnpm install && pnpm run build
Start Command: pnpm start
```

### 4. PostgreSQL Database Ekle
1. Dashboard'da "New +" butonuna tıkla
2. "PostgreSQL" seç
3. Ayarlar:
```
Name: traffic-takip-postgres
Database: traffic_takip
User: traffic_takip_user
Region: Oregon (US West)
Plan: Free
```

### 5. Redis Ekle
1. Dashboard'da "New +" butonuna tıkla
2. "Redis" seç
3. Ayarlar:
```
Name: traffic-takip-redis
Region: Oregon (US West)
Plan: Free
```

### 6. Environment Variables Set Et
Web service'de Environment Variables sekmesinde:

```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
SITE_SALT=your-production-salt-here
JWT_SECRET=your-production-jwt-secret-here
HMAC_SECRET=your-production-hmac-secret-here
CLICKHOUSE_HOST=your-clickhouse-host
CLICKHOUSE_PASSWORD=your-clickhouse-password
GEOIP_API_KEY=your-geoip-api-key
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_ACCESS_TOKEN=your-meta-access-token
```

### 7. Database Connection Variables
PostgreSQL ve Redis eklendikten sonra:

```
PG_HOST=${{traffic-takip-postgres.host}}
PG_PORT=${{traffic-takip-postgres.port}}
PG_DATABASE=${{traffic-takip-postgres.database}}
PG_USERNAME=${{traffic-takip-postgres.user}}
PG_PASSWORD=${{traffic-takip-postgres.password}}
PG_SSL=true

REDIS_HOST=${{traffic-takip-redis.host}}
REDIS_PORT=${{traffic-takip-redis.port}}
REDIS_PASSWORD=${{traffic-takip-redis.password}}
REDIS_DB=0
REDIS_KEY_PREFIX=ut:
```

### 8. Deploy Et
1. "Create Web Service" butonuna tıkla
2. Build işlemini bekle (5-10 dakika)
3. URL'yi al: `https://traffic-takip-app.onrender.com`

## ✅ Render Avantajları

- **Ücretsiz Plan:** 750 saat/ay
- **PostgreSQL:** Ücretsiz 1GB
- **Redis:** Ücretsiz 25MB
- **Otomatik Deploy:** GitHub push'unda
- **Custom Domain:** Ücretsiz
- **SSL:** Otomatik
- **Health Check:** `/api/v1/health`

## 🔧 Troubleshooting

- **Build Hatası:** Logs'u kontrol et
- **Database Bağlantısı:** Environment variables'ı kontrol et
- **Memory Limit:** Free plan 512MB RAM
- **Sleep Mode:** 15 dakika inaktivitede uyur

## 📊 Monitoring

- **Logs:** Dashboard'da real-time
- **Metrics:** CPU, Memory, Response time
- **Alerts:** Email notifications
