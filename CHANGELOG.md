# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-19

### Added
- Initial release of Traders Journal application
- Complete trading journal functionality with Supabase integration
- User authentication and profile management
- Trade recording and analysis features
- Social features (friends, shared trades, forum)
- Admin dashboard with monitoring capabilities
- Support system with email integration
- Mobile-responsive design
- Chat widget for user support
- Top-down analysis feature
- Monthly trade checkup system
- Export functionality (Excel, Word, PDF)
- Performance analytics and charts
- Medal achievement system

### Fixed
- Email addresses updated from `support@yourdomain.com` to `support@tradersjournal.pro`
- Mobile navigation: removed non-existent "Analytics" and "Journal" links
- Forgot password functionality: now uses correct production domain
- Mobile responsiveness improvements for chat widget and dashboard
- Metadata updated to use correct domain

### Changed
- Updated all support contact information to use production domain
- Improved mobile navigation layout and functionality
- Enhanced chat widget positioning for mobile devices
- Optimized dashboard layout for mobile browsers

### Security
- Implemented proper authentication flow
- Added Supabase RLS policies for data security
- Secure password reset functionality
- Protected admin routes and functionality 