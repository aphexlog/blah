# Deployment Guide - NextGen EDC

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+

### Development Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd nextgen-edc
npm install
```

2. **Environment Configuration**
```bash
# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Configure your API keys
export OPENAI_API_KEY="your-openai-key"
export AZURE_SPEECH_KEY="your-azure-speech-key"
export AZURE_SPEECH_REGION="eastus"
```

3. **Start Development Environment**
```bash
# Start infrastructure
docker-compose up -d postgres redis

# Install dependencies for all packages
npm run install:all

# Start all services
npm run dev
```

4. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Admin Dashboard: http://localhost:3002

### Production Deployment

## Docker Deployment

### Build Images
```bash
# Build all images
npm run docker:build

# Or build individually
docker build -t nextgen-edc/backend ./backend
docker build -t nextgen-edc/frontend ./frontend
docker build -t nextgen-edc/admin ./admin
```

### Docker Compose Production
```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3 --scale frontend=2
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (1.24+)
- kubectl configured
- Helm 3.x installed

### Deploy with Kubernetes
```bash
# Create namespace
kubectl create namespace nextgen-edc

# Apply configurations
kubectl apply -f deployment/namespace.yaml
kubectl apply -f deployment/configmap.yaml
kubectl apply -f deployment/secrets.yaml

# Deploy database and cache
kubectl apply -f deployment/postgres.yaml
kubectl apply -f deployment/redis.yaml

# Deploy application services
kubectl apply -f deployment/backend.yaml
kubectl apply -f deployment/frontend.yaml
kubectl apply -f deployment/ingress.yaml

# Check deployment status
kubectl get pods -n nextgen-edc
kubectl get services -n nextgen-edc
```

### Helm Deployment
```bash
# Add Helm repository (if applicable)
helm repo add nextgen-edc https://charts.nextgen-edc.com
helm repo update

# Install with Helm
helm install nextgen-edc nextgen-edc/nextgen-edc \
  --namespace nextgen-edc \
  --create-namespace \
  --values values.prod.yaml

# Upgrade deployment
helm upgrade nextgen-edc nextgen-edc/nextgen-edc \
  --namespace nextgen-edc \
  --values values.prod.yaml
```

## Cloud Deployments

### AWS Deployment

#### ECS Fargate
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag nextgen-edc/backend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/nextgen-edc/backend:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/nextgen-edc/backend:latest

# Deploy with CDK or Terraform
cdk deploy NextGenEDCStack
```

#### EKS (Kubernetes)
```bash
# Create EKS cluster
eksctl create cluster --name nextgen-edc --region us-east-1 --nodes 3

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name nextgen-edc

# Deploy application
kubectl apply -f deployment/
```

### Azure Deployment

#### Container Instances
```bash
# Create resource group
az group create --name nextgen-edc --location eastus

# Create container group
az container create \
  --resource-group nextgen-edc \
  --name nextgen-edc-backend \
  --image nextgen-edc/backend:latest \
  --ports 3001 \
  --environment-variables \
    NODE_ENV=production \
    DATABASE_URL="postgresql://..." \
  --secure-environment-variables \
    JWT_SECRET="..." \
    OPENAI_API_KEY="..."
```

#### AKS (Kubernetes)
```bash
# Create AKS cluster
az aks create \
  --resource-group nextgen-edc \
  --name nextgen-edc-aks \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group nextgen-edc --name nextgen-edc-aks

# Deploy application
kubectl apply -f deployment/
```

### Google Cloud Deployment

#### Cloud Run
```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/nextgen-edc-backend ./backend

# Deploy to Cloud Run
gcloud run deploy nextgen-edc-backend \
  --image gcr.io/PROJECT_ID/nextgen-edc-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL=postgresql://...
```

#### GKE (Kubernetes)
```bash
# Create GKE cluster
gcloud container clusters create nextgen-edc \
  --num-nodes 3 \
  --zone us-central1-a

# Get credentials
gcloud container clusters get-credentials nextgen-edc --zone us-central1-a

# Deploy application
kubectl apply -f deployment/
```

## Database Setup

### PostgreSQL Configuration
```sql
-- Create database and user
CREATE DATABASE nextgen_edc;
CREATE USER edc_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE nextgen_edc TO edc_user;

-- Run migrations
npm run db:migrate

-- Seed initial data
npm run db:seed
```

### Redis Configuration
```bash
# Redis configuration for production
redis-server /etc/redis/redis.conf

# Enable persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
```

## Environment Variables

### Backend Environment
```env
# Core Configuration
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# AI Services
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=eastus

# File Storage
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_BUCKET_NAME=nextgen-edc-files

# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### Frontend Environment
```env
# API Configuration
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com

# External Services
VITE_MAPBOX_TOKEN=your-mapbox-token
VITE_SENTRY_DSN=your-frontend-sentry-dsn

# Feature Flags
VITE_ENABLE_VOICE_INPUT=true
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_OFFLINE_MODE=true

# App Configuration
VITE_APP_NAME="NextGen EDC"
VITE_APP_VERSION="1.0.0"
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Custom Certificate
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring Setup

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nextgen-edc-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'
    
  - job_name: 'nextgen-edc-postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

### Grafana Dashboard
```bash
# Import pre-built dashboards
# Dashboard ID: 12345 (Custom NextGen EDC Dashboard)
# Dashboard ID: 893 (Node.js Application Dashboard)
# Dashboard ID: 9628 (PostgreSQL Dashboard)
```

## Backup Strategy

### Database Backup
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="nextgen_edc"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-backup-bucket/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### File Storage Backup
```bash
#!/bin/bash
# backup-files.sh
DATE=$(date +%Y%m%d_%H%M%S)

# Sync files to backup location
aws s3 sync s3://nextgen-edc-files s3://nextgen-edc-backup/files_$DATE/

# Create snapshot (if using EBS volumes)
aws ec2 create-snapshot --volume-id vol-xxxxxxxxx --description "NextGen EDC backup $DATE"
```

## Scaling Considerations

### Horizontal Scaling
- **Backend**: Stateless design allows easy horizontal scaling
- **Database**: Read replicas for read-heavy workloads
- **Cache**: Redis clustering for high availability
- **File Storage**: CDN integration for global distribution

### Performance Optimization
- **Database Indexing**: Optimize queries with proper indexes
- **Connection Pooling**: Use connection pooling for database efficiency
- **Caching Strategy**: Multi-layer caching (Redis, CDN, browser)
- **Asset Optimization**: Compress and optimize static assets

### Load Testing
```bash
# Install k6
curl https://github.com/grafana/k6/releases/download/v0.46.0/k6-v0.46.0-linux-amd64.tar.gz -L | tar xvz

# Run load test
./k6 run --vus 100 --duration 30s load-test.js
```

## Troubleshooting

### Common Issues
1. **Database Connection Issues**: Check connection string and network connectivity
2. **Redis Connection Timeout**: Verify Redis server is running and accessible
3. **SSL Certificate Issues**: Ensure certificates are valid and properly configured
4. **High Memory Usage**: Monitor for memory leaks and optimize queries
5. **Slow API Responses**: Check database performance and add appropriate indexes

### Health Checks
```bash
# Backend health check
curl -f http://localhost:3001/health || exit 1

# Database connectivity
pg_isready -h localhost -p 5432 -U edc_user

# Redis connectivity
redis-cli ping

# Check service status in Kubernetes
kubectl get pods -n nextgen-edc
kubectl describe pod <pod-name> -n nextgen-edc
kubectl logs <pod-name> -n nextgen-edc
```

This deployment guide provides comprehensive instructions for deploying NextGen EDC in various environments, from development to production-scale deployments.