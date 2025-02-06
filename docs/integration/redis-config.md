# Redis Configuration

## Overview
This document outlines the Redis configuration used in the DEX price comparison system. Redis serves as a high-performance cache layer for storing real-time price data and intermediate calculation results.

## Docker Configuration
The Redis instance is deployed using the official Redis Docker image from redislabs/redis. Below are the key configuration parameters:

### Container Settings
- Image: `redislabs/redis:latest`
- Container Name: `dex-price-redis`
- Restart Policy: Always
- Network Mode: Bridge
- Port Mapping: 6379:6379 (Host:Container)

### Data Persistence
- Volume Mount: `/data:/data`
- Persistence Strategy: RDB (Redis Database)
- Save Intervals: 
  - 900 seconds if at least 1 key changed
  - 300 seconds if at least 10 keys changed
  - 60 seconds if at least 10000 keys changed

### Security
- Protected Mode: Enabled
- Password Authentication: Required
- TLS/SSL: Disabled (internal network only)

### Resource Limits
- Memory: 512MB
- CPU: 1 core

### Performance Tuning
- maxmemory-policy: allkeys-lru
- appendonly: yes
- appendfsync: everysec

## Connection Details
Redis connection parameters are configured through environment variables:
- REDIS_HOST=localhost
- REDIS_PORT=6379
- REDIS_PASSWORD=<configured at runtime>
- REDIS_DB=0

## Usage Guidelines
1. All services should use the Redis client configuration from the shared configuration module
2. Implement appropriate error handling for Redis connection issues
3. Use key prefixes to prevent naming collisions between different services
4. Set appropriate TTL (Time To Live) values for cached data

## Monitoring
- Redis metrics are exposed on port 9121 for Prometheus monitoring
- Key metrics to monitor:
  - Memory usage
  - Connected clients
  - Cache hit ratio
  - Operation latency

## Backup Strategy
- Regular RDB snapshots
- Backup schedule: Every 6 hours
- Retention period: 7 days

## Security Considerations
1. Redis instance is not exposed to public network
2. Password authentication is mandatory
3. Protected mode ensures connections only from trusted networks
4. Regular security updates through Docker image updates