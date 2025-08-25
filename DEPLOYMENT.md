# IIS Deployment Guide for Sri Rushi Chit Tracker

This guide will help you deploy the Sri Rushi Chit Tracker application to IIS (Internet Information Services) using Node.js hosting.

## Prerequisites

1. **Windows Server** with IIS installed
2. **Node.js** (version 16 or higher) installed on the server
3. **URL Rewrite Module** installed on IIS
4. **Application Request Routing (ARR)** installed on IIS (optional, for better performance)
5. **iisnode** module for hosting Node.js applications in IIS

## Build Process

### 1. Build the Application

```bash
# Install dependencies
npm install

# Build for IIS deployment
npm run build:iis
```

This will:
- Build the Next.js application
- Create optimized production build in `.next` directory

### 2. Deploy to IIS

1. **Copy Files**: Copy the entire project folder to your IIS web directory
   ```
   C:\inetpub\wwwroot\ChitReferralTracker\
   ```

2. **Install iisnode**:
   - Download iisnode from: https://github.com/Azure/iisnode/releases
   - Install on your IIS server
   - Restart IIS after installation

3. **Configure IIS Site**:
   - Open IIS Manager
   - Create a new website or application
   - Set the physical path to your deployment folder
   - Configure the application pool (recommended: .NET CLR Version "No Managed Code")

## IIS Configuration

### Application Pool Settings

1. **Open IIS Manager** → Application Pools
2. **Select your app pool** and click "Advanced Settings"
3. **Configure**:
   - .NET CLR Version: "No Managed Code"
   - Managed Pipeline Mode: "Integrated"
   - Identity: "ApplicationPoolIdentity" (or custom account with proper permissions)

### Website Configuration

1. **Bindings**: Configure your domain/IP and port
2. **Authentication**: Enable Anonymous Authentication
3. **Authorization**: Ensure proper access permissions

### URL Rewrite Module

The `web.config` file includes URL rewrite rules for SPA routing. Ensure the URL Rewrite Module is installed:

1. Download from: https://www.iis.net/downloads/microsoft/url-rewrite
2. Install on your IIS server
3. Restart IIS after installation

## Environment Configuration

### 1. Environment Variables

Create a `.env.local` file in your deployment directory:

```env
# Database Configuration
DATABASE_URL="file:./dev.db"

# JWT Secret
JWT_SECRET="your-secret-key-here"

# Application Settings
NEXT_PUBLIC_APP_URL="https://your-domain.com/ChitReferralTracker"
NODE_ENV="production"
```

### 2. Database Setup

For production, consider using a proper database:

```env
# SQL Server (recommended for Windows/IIS)
DATABASE_URL="sqlserver://server:port;database=chit_tracker;user=username;password=password;trustServerCertificate=true"

# Or SQLite (for development/testing)
DATABASE_URL="file:./production.db"
```

## Security Considerations

### 1. HTTPS Configuration

Configure SSL certificate in IIS:
1. **Install SSL Certificate** in IIS
2. **Add HTTPS binding** to your website
3. **Redirect HTTP to HTTPS** using URL Rewrite rules

### 2. Security Headers

The `web.config` includes security headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: origin-when-cross-origin
- X-XSS-Protection: 1; mode=block

### 3. File Permissions

Ensure proper file permissions:
```powershell
# Set permissions for IIS_IUSRS
icacls "C:\inetpub\wwwroot\ChitReferralTracker" /grant "IIS_IUSRS:(OI)(CI)(RX)"
icacls "C:\inetpub\wwwroot\ChitReferralTracker" /grant "IUSR:(OI)(CI)(RX)"
```

## Troubleshooting

### Common Issues

1. **404 Errors on Refresh**:
   - Ensure URL Rewrite Module is installed
   - Check web.config rules are correct

2. **Static Files Not Loading**:
   - Verify MIME types in web.config
   - Check file permissions

3. **CORS Issues**:
   - Update CORS headers in web.config if needed
   - Configure proper origins

4. **Performance Issues**:
   - Enable compression in web.config
   - Configure caching headers
   - Use Application Request Routing (ARR) for load balancing

### Logs

Check IIS logs for errors:
```
C:\inetpub\logs\LogFiles\W3SVC1\
```

## Maintenance

### 1. Updates

To update the application:
1. Build new version: `npm run build:iis`
2. Backup current deployment
3. Replace files in IIS directory
4. Clear browser cache

### 2. Database Backups

Regular database backups:
```bash
# SQLite backup
copy production.db backup_$(date +%Y%m%d).db

# SQL Server backup (use SQL Server Management Studio or scripts)
```

### 3. Monitoring

Monitor application health:
- IIS logs
- Application performance
- Database performance
- Error rates

## Performance Optimization

### 1. Caching

Configure caching in web.config:
```xml
<staticContent>
  <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="7.00:00:00" />
</staticContent>
```

### 2. Compression

Enable compression for better performance (already configured in web.config)

### 3. CDN

Consider using a CDN for static assets:
- Images
- CSS/JS files
- Fonts

## Support

For deployment issues:
1. Check IIS logs
2. Verify web.config configuration
3. Test with a simple static file
4. Check file permissions
5. Verify URL Rewrite Module installation

## Additional Resources

- [IIS Documentation](https://docs.microsoft.com/en-us/iis/)
- [URL Rewrite Module](https://docs.microsoft.com/en-us/iis/extensions/url-rewrite-module/)
- [Next.js Static Export](https://nextjs.org/docs/advanced-features/static-html-export)
