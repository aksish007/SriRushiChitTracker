# SRI RUSHI CHITS - Chit Fund Management System

A comprehensive, production-ready chit fund management system built with Next.js 14, TypeScript, and modern web technologies.

## 🌟 Features

### User Management
- **Role-based Access Control**: Admin and User roles with specific permissions
- **Automatic ID Generation**: Unique RegistrationId (REG-XXXXXX) for each user
- **Bulk User Upload**: Excel-based bulk user registration with validation
- **Referral System**: Maximum 3 direct referrals per user, unlimited depth levels

### Chit Fund Operations
- **Chit Scheme Management**: Create and manage multiple chit schemes
- **Subscription Management**: Unique SubscriberId (SUB-CHITID-XXX) per subscription
- **Payout Tracking**: Monthly payout management with status tracking
- **Interactive Referral Tree**: Visual hierarchy representation

### Advanced Features
- **Excel Import/Export**: Bulk operations with comprehensive error handling
- **Real-time Dashboard**: Analytics and performance metrics
- **Comprehensive Reports**: Multiple export formats (Excel/PDF)
- **Audit Trail**: Complete system activity logging

## 🚀 Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, TailwindCSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **Database**: SQLite (Prisma ORM) - easily switchable to PostgreSQL/MySQL
- **Authentication**: JWT-based with secure middleware
- **Charts**: Recharts for data visualization
- **File Processing**: xlsx for Excel operations
- **Styling**: Tailwind CSS with custom design system

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Local Development

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd sri-rushi-chits
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Update .env with your configuration
   ```

3. **Database Setup**
   ```bash
   npx prisma db push
   npx tsx seed.ts
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Using Docker

1. **Development Environment**
   ```bash
   docker-compose --profile dev up
   ```

2. **Production Environment**
   ```bash
   docker-compose up
   ```

## 🔑 Demo Credentials

After running the seed script, use these credentials:

- **Admin**: admin@sriruschichits.com / admin123
- **User**: user@sriruschichits.com / user123

## 🏗️ Architecture

### Database Schema
- **Users**: Registration management with referral relationships
- **ChitSchemes**: Chit fund scheme definitions
- **ChitSubscriptions**: User subscriptions to schemes
- **Payouts**: Monthly payout tracking
- **AuditLog**: System activity and compliance tracking

### API Endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/chit-schemes/*` - Scheme management
- `/api/subscriptions/*` - Subscription operations
- `/api/payouts/*` - Payout processing
- `/api/referral-tree/*` - Referral hierarchy
- `/api/reports/*` - Export functionality

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#2563eb) - Trust and reliability
- **Secondary**: Green (#059669) - Growth and success
- **Accent**: Gold (#d97706) - Premium and value
- **Status Colors**: Success, warning, error variants

### Components
- Responsive design with mobile-first approach
- Consistent 8px spacing system
- Smooth animations and micro-interactions
- Dark/light mode support
- Accessible UI components

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-based Access**: Admin/User permission levels
- **Input Validation**: Comprehensive form validation
- **Audit Logging**: Complete activity tracking
- **Rate Limiting**: API endpoint protection
- **Data Sanitization**: XSS and injection prevention

## 📊 Key Functionalities

### For Admins
- Register new users with automatic ID generation
- Bulk user upload via Excel files
- Create and manage chit schemes
- Assign subscriptions to users
- Process and track payouts
- View complete system analytics
- Generate comprehensive reports

### For Users  
- Secure login and profile management
- View personal subscriptions and IDs
- Track complete referral tree
- Monitor payout history
- Generate referral links
- Access personal dashboard

## 🚀 Deployment

### Production Checklist
- [ ] Update environment variables
- [ ] Configure database connection
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Environment Variables
```env
DATABASE_URL="your-database-url"
JWT_SECRET="your-secure-jwt-secret"
NODE_ENV="production"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="your-production-url"
```

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

## 📝 API Documentation

The system provides a comprehensive REST API. Key endpoints include:

- **Authentication**: Login, logout, session management
- **User Management**: CRUD operations, bulk upload
- **Chit Operations**: Schemes, subscriptions, payouts
- **Reports**: Export functionality, analytics
- **Referral System**: Tree visualization, relationship tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates and Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] SMS/Email notifications
- [ ] Payment gateway integration
- [ ] Multi-language support
- [ ] Advanced reporting features

---

**SRI RUSHI CHITS INDIA PRIVATE LIMITED** - Complete Chit Fund Management Solution