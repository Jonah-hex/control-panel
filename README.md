# نظام إدارة العمارات والوحدات السكنية
**Building & Unit Management Control Panel System**

A comprehensive full-stack property management system built with Next.js, React, TypeScript, and Supabase. Manage buildings, units, generate detailed reports, and access advanced analytics.

## ✨ Features

### 🏢 Building Management
- Add, edit, and view building information
- Track building units and status
- Google Maps integration
- Guard shift management (day/night/both)
- Owner/association management with 11 detailed fields
- Building neighborhood tracking

### 🏠 Unit Management
- View all units with real-time status updates
- Filter by status (available/reserved/sold)
- Search functionality
- Export to CSV
- Unit type and room number tracking

### 📊 Reports & Analytics
- **Reports Page**: Comprehensive building-by-building analysis
  - Summary statistics (Buildings, Units, Revenue, Occupancy)
  - Unit distribution by status
  - Detailed building table with 9 columns
  - Export/Print functionality
  
- **Statistics Page**: Advanced analytics dashboard
  - 4 main KPI cards
  - Unit distribution visualization
  - Geographic neighborhood analysis
  - Unit type distribution (Apartment, Studio, Duplex, Penthouse, etc.)
  - Room distribution analysis (1-5+ rooms)

### 🎯 Dashboard Features
- Quick action buttons for common tasks
- Real-time statistics cards
- Navigation to all management pages
- Responsive design for all devices

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase project (with configured RLS policies)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd booking

# Install dependencies
npm install

# Create .env.local with Supabase credentials
echo "NEXT_PUBLIC_SUPABASE_URL=your_url" >> .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key" >> .env.local

# Run development server
npm run dev
```

### Access the Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

Default routes:
- `/dashboard` - Main control panel
- `/dashboard/buildings` - Building list
- `/dashboard/buildings/[id]` - Building details
- `/dashboard/buildings/new` - Add new building
- `/dashboard/units` - Unit management
- `/dashboard/reports` - Reports & analysis
- `/dashboard/statistics` - Advanced analytics

## 🛠️ Tech Stack

**Frontend**
- Next.js 14.2.35 (React 18+)
- TypeScript
- Tailwind CSS
- Lucide React (30+ professional icons)

**Backend**
- Supabase (PostgreSQL)
- Row-Level Security (RLS)
- Real-time subscriptions

**Deployment**
- Vercel recommended

## 📋 Project Structure

```
src/
  app/
    dashboard/
      page.tsx                 # Main dashboard
      buildings/
        page.tsx              # Buildings list
        [id]/page.tsx         # Building details
        new/page.tsx          # Add building
        edit/[id]/page.tsx    # Edit building
      units/
        page.tsx              # Units management
      reports/
        page.tsx              # Reports & analysis
      statistics/
        page.tsx              # Analytics dashboard
  lib/
    supabase/
      client.ts               # Supabase client
      server.ts               # Server-side utilities
      middleware.ts           # Auth middleware
```

## 🎨 Design Features

- **Responsive Design**: Mobile-first approach, works on all devices
- **Modern UI**: Gradient backgrounds, smooth transitions, professional icons
- **Real-time Updates**: Supabase subscriptions for live data
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Performance**: Optimized loading, efficient queries

## 📈 Key Statistics

- **Buildings**: Multi-unit building management
- **Units**: Individual unit tracking across multiple buildings
- **Revenue Tracking**: Calculate occupancy rates and revenue metrics
- **Geographic Distribution**: Analyze units by neighborhood
- **Detailed Analytics**: Room distribution, unit types, status breakdown

## 🔒 Security

- Row-Level Security (RLS) policies on Supabase
- Authentication required for dashboard access
- User-based data isolation
- Environment variable configuration for sensitive data

## 📚 Documentation

Comprehensive documentation files included:
- `COMPLETE_SYSTEM_DOCUMENTATION.md` - Full user guide
- `SYSTEM_OVERVIEW.md` - Architecture overview
- `DASHBOARD_INTEGRATION_SUMMARY.md` - Integration details
- `CHANGELOG.md` - Version history

## 🔧 Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start

# Deploy to Vercel (recommended)
vercel
```

## 📝 License

Private project.

## 🤝 Support

For questions or issues, contact the development team.

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Updated**: 2024
