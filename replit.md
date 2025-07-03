# Wedding Gallery App

## Overview

This is a full-stack wedding gallery application built with React, Express, and PostgreSQL. The app provides an Instagram-style interface for wedding guests to share photos, videos, and messages during the wedding celebration. It features real-time interactions, Spotify integration for music requests, and comprehensive admin controls.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server:

- **Frontend**: React with TypeScript, using Vite for development and building
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **External Services**: Firebase for media storage and real-time features, Spotify API for music integration
- **Styling**: Tailwind CSS with shadcn/ui components for a modern, responsive design

## Key Components

### Frontend Architecture
- **React Components**: Modular component structure with proper TypeScript typing
- **State Management**: React hooks for local state, custom hooks for shared logic
- **Routing**: Single-page application with client-side routing
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with dark mode support and responsive design

### Backend Architecture
- **Express Server**: RESTful API structure with middleware for logging and error handling
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Storage Interface**: Abstracted storage layer supporting both in-memory and database implementations
- **Authentication**: Simple username-based authentication system

### Database Schema
- **Users Table**: Stores user credentials with unique usernames
- **Schema Definition**: Located in `shared/schema.ts` for type sharing between client and server
- **Migrations**: Drizzle migrations in the `migrations` directory

## Data Flow

1. **User Authentication**: Users provide usernames which are stored locally and used for session management
2. **Media Upload**: Files uploaded to Firebase Storage with metadata stored in Firestore
3. **Real-time Updates**: Firebase Firestore provides real-time synchronization for comments, likes, and stories
4. **API Communication**: RESTful endpoints for CRUD operations on user data
5. **External Integrations**: Spotify API for music playlist management

## External Dependencies

### Core Dependencies
- **React & TypeScript**: Frontend framework and type safety
- **Express**: Backend web framework
- **Drizzle ORM**: Database ORM with PostgreSQL support
- **Firebase**: Cloud storage and real-time database
- **Tailwind CSS**: Utility-first CSS framework

## Project Analysis Summary

This is a comprehensive wedding gallery application with the following architecture:

### Core Technologies
- **Frontend**: React 18 with TypeScript, Vite for development
- **Backend**: Express.js with TypeScript, minimal API routes
- **Database**: PostgreSQL with Drizzle ORM (for user management)
- **Real-time Data**: Firebase Firestore for media, comments, likes, stories
- **File Storage**: Firebase Storage for images and videos
- **Authentication**: Simple username-based system with admin controls

### Key Features
1. **Instagram-style Gallery**: Photo/video sharing with likes and comments
2. **Stories System**: 24-hour expiring stories like Instagram  
3. **Live User Tracking**: Real-time presence indicators
4. **Admin Panel**: Content moderation and site controls
5. **Timeline**: Wedding milestone tracking
6. **Music Wishlist**: Spotify integration for song requests
7. **User Profiles**: Custom avatars and display names
8. **Mobile Responsive**: Optimized for wedding guests on phones

### Data Flow
- Media files → Firebase Storage
- Metadata → Firebase Firestore (real-time sync)
- User accounts → PostgreSQL via Drizzle ORM
- Live features → Firebase real-time listeners

### Security Architecture
- Client/server properly separated
- Firebase security rules control access
- Admin authentication with session management
- Media deletion with proper permission checks

## Recent Changes

### January 25, 2025
- **Profile Header Admin Controls**: Moved admin controls to profile header with profile picture and gear icon design, replacing fixed top-right admin toggle
- **Lock/Unlock Admin Toggle**: Added lock/unlock icons in profile header for seamless admin mode switching
- **Settings Gear Icon**: Integrated settings gear icon in profile header for profile editing access
- **Fixed Profile Picture Button Removal**: Removed old fixed position profile picture button in favor of integrated header design
- **Display Name Override System**: Implemented complete display name system that overrides usernames throughout the UI when users set custom display names in their profiles
- **Selfie Camera Button**: Fixed profile edit modal selfie button to properly trigger camera capture instead of gallery picker for taking profile picture selfies
- **Cross-Component Display Name Sync**: Updated all components (InstagramPost, NotePost, MediaModal, InstagramGallery) to consistently show display names for posts, comments, and media attribution
- **Automatic Profile Creation**: Enhanced content posting workflow to automatically create user profiles ensuring proper display name tracking for all contributors

### January 25, 2025 (Later)
- **Profile Edit Security Fix**: Fixed profile editing gear icon to only show in admin mode, preventing unauthorized access to profile editing functionality

### January 25, 2025 (Permission System Fixed)
- **Song Deletion Permissions**: Fixed MusicWishlist permission system so users can only delete songs they personally added to the playlist, while admins can delete all songs
- **Admin State Management**: Updated MusicWishlist to properly receive and use admin state from parent App component instead of assuming all Spotify users are admins
- **Mobile Layout Fix**: Corrected deformed song layout in MusicWishlist with proper responsive grid system for mobile, tablet, and desktop views
- **Permission Debugging**: Added and tested permission checking logic to verify user ID matching for song deletion rights
- **Firebase Song Ownership**: Implemented Firebase-based song tracking using wedding app user system (username + deviceId) instead of Spotify users for proper permission management
- **Instagram 2.0 Greenish Redesign**: Applied modern glassmorphism styling to MusicWishlist with green color scheme, improved text readability, larger album artwork, and enhanced hover effects
- **Gear Icon Enhancement**: Moved profile gear icon to center position and increased size for better visibility and accessibility

### January 26, 2025 (Layout Improvements)
- **Header Layout Restructure**: Moved live user indicator from left to right side of header for better visual balance and user experience
- **Floating Admin Controls**: Relocated admin toggle and settings buttons from header to fixed bottom-left corner position as floating action buttons with enhanced visibility
- **Intuitive Profile Button**: Redesigned visitor profile edit button from confusing circular icon to clear labeled "Profil" button with icon and text for better user recognition
- **Improved Admin Accessibility**: Admin controls now positioned as prominent floating buttons (lock/unlock and settings gear) in bottom-left corner for easier access
- **Enhanced Profile UX**: Profile edit button now clearly shows "Profil" text with user avatar or UserPlus icon, making profile editing functionality obvious to users
- **Pure Glassmorphism Profile Button**: Applied clean glass styling with transparent backgrounds, rounded-2xl corners, backdrop blur effects, and neutral shadows without colored gradients
- **Fixed Text Override**: Resolved profile button text cutoff with proper flex controls, truncation handling, and optimized spacing for clean display
- **Uniform Button Heights**: Standardized profile button and live user indicator to same 40px height for consistent header alignment

### January 26, 2025 (UI Fixes)
- **User Management Overlap Fix**: Fixed overlapping profile picture and upload button in User Management interface by completely separating upload button from profile picture container for cleaner mobile layout
- **Real-time Profile Picture Sync**: Implemented comprehensive real-time synchronization system with custom events, immediate refresh triggers, and cross-component communication for instant profile picture updates in User Management interface
- **Firebase Notification Error Fix**: Resolved "Unsupported field value: undefined" error in notification system by filtering out undefined values before creating Firebase documents and adding missing mediaType/mediaUrl props to MediaTagging component
- **Mobile Notification Center Enhancement**: Completely redesigned NotificationCenter component with full mobile responsiveness including full-width dropdown on mobile screens, semi-transparent overlay for touch interaction, proper responsive positioning that prevents off-screen display, and optimized touch-friendly interface for seamless mobile notification management
- **MediaModal Mobile Optimization**: Redesigned MediaModal for mobile devices with clean white close button (48x48px) positioned lower on screen (top-16), high contrast design, tap-to-close overlay functionality, and touch-optimized interactions for seamless mobile photo viewing from notifications
- **German Customer README**: Created comprehensive German README.md documentation for customers explaining all features, setup instructions, and best practices for wedding gallery usage
- **Geo Tagging Street Name Removal**: Updated location services to exclude street names from geo tagging, showing only establishment names, points of interest, and city/region information for cleaner location display

### January 3, 2025 (Germany-Wide Location Service Implementation)
- **Germany-Wide Location Search**: Implemented comprehensive nationwide location search using Overpass API covering entire Germany with authentic business and landmark data
- **Distance-Based Sorting**: Added automatic distance calculation and sorting using Haversine formula to show nearest locations first based on user's GPS coordinates
- **Multi-Source Location Data**: Enhanced location service with OpenStreetMap Overpass API for detailed business data, Nominatim for general places, and Google Geocoding fallback
- **Real Business Discovery**: Location search now finds authentic establishments across Germany including restaurants, hotels, churches, shops, and tourist attractions with precise coordinates and addresses
- **Proximity-Based Results**: System returns up to 20 real locations sorted by distance from user's current position, ensuring most relevant nearby options appear first

### January 3, 2025 (Mobile Video Thumbnail Fix)
- **Mobile Video Thumbnail System**: Fixed critical mobile video thumbnail issue where videos showed no thumbnail on mobile devices, only displaying after manual page reload
- **Canvas-Based Thumbnail Generation**: Implemented new VideoThumbnail component using HTML5 Canvas API to generate reliable video thumbnails that work consistently across all mobile browsers
- **Mobile Browser Compatibility**: Replaced unreliable `poster` attribute with `#t=0.1` fragment (not supported on mobile) with proper canvas-based thumbnail extraction
- **Real-time Thumbnail Generation**: Videos now automatically generate thumbnails at 0.1 second mark using canvas.drawImage() method for consistent mobile display
- **Enhanced Error Handling**: Added comprehensive fallback system for video thumbnail generation with loading states and error recovery
- **Instagram Gallery Integration**: Updated InstagramGallery component to use new VideoThumbnail component for reliable mobile video display
- **Timeline Component Enhancement**: Applied same video thumbnail fix to Timeline component ensuring consistent video display across all app sections
- **Performance Optimization**: Implemented efficient thumbnail caching and blob URL management to prevent memory leaks

### January 3, 2025 (StoriesBar Sorting Bug Fixed)
- **Stories Bar Viewed Sorting Fix**: Fixed critical bug where viewed stories weren't moving to the end of horizontal StoriesBar - angesehene Stories now correctly move to back position sorted by oldest first instead of newest first
- **Instagram-like Story Behavior**: Implemented proper Instagram behavior where newly viewed stories automatically move to the end of the horizontal scroll list without colored rings
- **Story Position Logic**: Updated sorting algorithm so viewed stories sort by creation time (oldest first) ensuring recently viewed stories move to the back while maintaining chronological order for viewed content

### January 3, 2025 (StoriesBar Enhancement & Migration Complete)
- **Horizontal Scrollable StoriesBar**: Enhanced StoriesBar component with smooth horizontal scrolling using snap-scroll behavior and touch-friendly navigation for mobile devices
- **Profile Picture Integration**: Updated StoriesBar to use visitor profile pictures as story placeholders with fallback to story thumbnails, ensuring proper visitor separation and identification
- **Visitor Story Separation**: Fixed story display to properly separate stories by individual visitors instead of cumulating all stories together
- **StoriesViewer User Filtering**: Implemented user-specific story filtering in StoriesViewer component - now shows only selected visitor's stories instead of all stories mixed together
- **Enhanced Story Navigation**: Updated story click handling to pass userName parameter and filter stories appropriately for seamless visitor-specific story viewing experience
- **Story Ring Behavior Fix**: Fixed story rings to disappear after viewing and implemented proper sorting so viewed stories move to the end of the list, prioritizing unviewed content first
- **Device ID Tracking Integration**: Enhanced viewed story tracking to use deviceId instead of username for consistent story viewing state across user interactions
- **Smart Story Sorting**: Implemented priority-based sorting: unviewed stories first, then viewed stories at the end, with current user priority within each group
- **Snap Scroll Navigation**: Added snap-start classes to story items for better mobile scrolling experience with smooth transitions between story previews
- **Enhanced Story Visual Design**: Improved story ring indicators with proper unviewed story highlighting and story count badges for users with multiple stories

### July 3, 2025 (Story Viewer Complete Fix)
- **Progress Animation Bug Fixed**: Fixed buggy progress animation in StoriesViewer by adding immediate progress reset when navigating between stories and proper cleanup in animation loop
- **Story Reopening Issue Resolved**: Fixed issue where viewed stories couldn't be reopened by implementing proper user-specific story filtering within the StoriesViewer component
- **Modal Opening Bug Fixed**: Resolved critical issue where StoriesViewer modal wouldn't open when clicking on story avatars - fixed React state update during render warning and early return conditions that were preventing modal display
- **Initial Index Calculation Fixed**: Moved initial story index calculation from render-time function to useEffect hook to prevent state update warnings and ensure proper modal opening
- **Loading State Handling**: Added proper loading state for when currentStory is not yet available, preventing premature modal closure and improving user experience
- **Navigation Improvements**: Enhanced story navigation with better progress reset logic and consistent story index handling across components

### January 3, 2025 (Replit Environment Migration Complete)
- **Replit Agent to Replit Migration**: Successfully migrated wedding gallery app from Replit Agent to Replit environment with full functionality preserved
- **Video Thumbnail System Fix**: Fixed video thumbnail display on mobile browsers by improving the VideoThumbnail component with better mobile compatibility, enhanced loading states, and transparent background handling
- **Feed Video Autoplay Implementation**: Added autoplay functionality to videos in Instagram feed view - videos now play directly when clicked instead of only opening modal, with play/pause toggle and controls display during playback
- **Google Places API Location Fix**: Resolved invalid locationBias error by updating from rectangle format to center/radius format for proper location search functionality
- **Enhanced Video User Experience**: Videos display proper thumbnails in both grid and feed views, with direct autoplay in feed for seamless Instagram-like experience
- **iPhone Delete Button Fix**: Fixed delete button functionality in admin mode on iPhone by implementing enhanced touch handling with onTouchEnd, onTouchStart event handlers, improved touch targets (48px minimum), WebKit-specific CSS properties for better iOS compatibility, and comprehensive error handling with fallback confirmation dialogs
- **Cross-Platform Touch Compatibility**: Updated all delete buttons across InstagramPost, NotePost, and InstagramGallery components with touch-manipulation CSS, preventDefault event handling, and enhanced visual feedback for mobile devices
- **Live User Tracking Verified**: Confirmed all Firebase integrations working properly with live user presence tracking showing multiple active users
- **Notification System Working**: Test notifications functioning correctly with proper notification center display and interaction
- **All Core Features Working**: Verified complete app functionality including Firebase integration, live user tracking, media uploads, comments, likes, stories, and music wishlist
- **Security and Performance**: Maintained proper client/server separation, database connections, and all external service integrations during migration

### January 3, 2025 (System Optimization)
- **Google Places API Migration**: Upgraded from Geocoding API to Google Places API with Text Search for superior local venue discovery and accurate establishment detection
- **Regional Location Database**: Implemented specialized Hannover/Niedersachsen region database with local establishments in Arnum, Hemmingen, and Hannover area for relevant fallback results
- **GPS-Based Proximity Location Search**: Implemented intelligent location search that sorts results by distance to user's current position using Google Places API with GPS coordinates and Haversine formula for accurate distance calculations
- **Smart Location Sorting**: Results now display closest venues first with distance indicators for locations over 2km away, providing users with relevant nearby establishments for photo/video location tagging
- **Enhanced Location Search for Restaurants**: Improved location search system with dual queries targeting restaurants, bars, cafes, and hotels specifically - enhanced importance scoring and prioritization for establishments vs general locations
- **Restaurant/Bar Detection System**: Added comprehensive establishment type detection with specific amenity filtering for restaurant, bar, cafe, pub, hotel, fast_food, biergarten, and nightclub categories for more accurate venue tagging
- **Delete Button Browser Compatibility**: Fixed delete button functionality across all browsers with enhanced event handling including preventDefault, stopPropagation, error handling with fallback confirmation, and improved touch compatibility with 44px minimum touch targets
- **Mobile Touch Optimization**: Added touch-manipulation CSS and onTouchStart handlers to all delete buttons for better mobile device interaction and responsiveness across different browser engines
- **Cross-Browser Event Handling**: Implemented robust event handling for delete confirmations with try-catch blocks and fallback mechanisms to ensure functionality even in browsers with limited confirm dialog support
- **Grid Video Click Behavior**: Modified video behavior in grid view to open modal instead of immediate autoplay - videos now only autoplay when opened in modal view for better user experience and control
- **Compact Admin Controls**: Made admin control buttons less intrusive by reducing padding (p-1 sm:p-2), smaller rounded corners (rounded-lg), reduced transparency, and lighter shadows for minimal visual interference while maintaining functionality

### January 26, 2025 (Music Permission Fix)
- **Music Deletion Bug Fixed**: Resolved issue where users couldn't delete their own songs after page refresh - song ownership records now load properly from Firebase
- **Permission System Verified**: Confirmed users can only delete songs they personally added while admins can delete all songs
- **Firebase Ownership Tracking**: Song ownership properly tracked using wedding app user system (username + deviceId) instead of Spotify users
- **Clean Console Output**: Removed debugging logs for production-ready music wishlist functionality

### January 26, 2025 (Complete Feature Updates)
- **Real Android/iPhone Push Notifications**: Implemented comprehensive push notification system with enhanced service worker supporting real mobile device notifications, including vibration patterns, notification icons, and click-to-navigate functionality
- **Enhanced Service Worker**: Created production-ready service worker with caching, background sync, and proper notification handling for Android and iPhone devices with PWA manifest configuration
- **Mobile Notification Icons**: Added proper notification icons (72x72, 192x192, 512x512) in SVG format with wedding gallery branding for Android/iPhone notification display
- **Push Notification Infrastructure**: Built foundation for VAPID key integration and backend push service with proper notification payload structure for production deployment
- **Live User Profile Pictures**: Enhanced LiveUserIndicator to display actual profile pictures for online users instead of initials, with fallback to username initials for users without profile pictures
- **Notification Click Navigation**: Implemented click-to-navigate functionality in notification center - users can click notifications to automatically navigate to tagged media with modal view opening
- **Profile Picture Avatar System**: Added comprehensive user profile picture loading to live user tracking with real-time avatar display in presence indicators
- **Notification Navigation Integration**: Connected notification system with main app navigation to seamlessly jump between notifications and media content
- **Firebase Profile Integration**: Enhanced live user tracking with Firebase profile picture synchronization for consistent avatar display across all user presence features
- **Google Maps Geocoding Integration**: Implemented Google's Geocoding API for superior location accuracy, correctly identifying specific locations like "Arnum, Hemmingen" instead of generic regional results
- **Multiple Geocoding Services**: Added fallback system with Google Maps API as primary, Nominatim and Photon as backups for enhanced location detection reliability
- **Enhanced Location Accuracy**: Improved GPS location precision with higher accuracy settings, fallback location methods, and enhanced reverse geocoding using multiple address components for more accurate location names
- **Location Search Autocomplete**: Implemented real-time location search with autocomplete suggestions using OpenStreetMap Nominatim API, filtering by importance scores and prioritizing meaningful location names
- **GPS Error Handling**: Added comprehensive error handling for location services with specific error messages for permission denied, position unavailable, and timeout scenarios
- **Location Service Improvements**: Enhanced location detection with 20-second timeout, 1-minute cache for fresh locations, and fallback to lower accuracy when high precision fails
- **Icon-Only Tag Buttons**: Updated user tagging and location tagging buttons to clean icon-only design with appropriate colors - purple for user tagging, green for location tagging
- **Enhanced User Tagging List**: Redesigned visitor tagging interface with profile pictures, improved visual hierarchy, glassmorphism styling, and cleaner card-based layout for better user selection experience

### January 26, 2025 (Earlier Updates)
- **Admin Profile Picture Management**: Implemented comprehensive admin functionality allowing admins to set profile pictures for any user through User Management interface with camera icon buttons
- **Real-time Profile Synchronization**: Added 3-second polling system for live profile picture updates across all components including top navigation, comment forms, and user avatars
- **Live Sync Across Components**: Fixed profile picture synchronization in InstagramPost comment forms to update immediately when admins set profile pictures for users
- **Camera Icon UI**: Added intuitive camera button overlays on user avatars in User Management modal for easy profile picture uploading with loading states and file validation
- **Profile Picture Registration Fix**: Fixed new user registration to properly save and display profile pictures during initial setup - profile pictures now sync correctly across comments, posts, and profile editing
- **Timeline Display Fix**: Resolved Timeline overflow with vertical layout for date/location badges and fixed floating header to integrate properly with content layout
- **Profile Picture Event Handler**: Enhanced user connection event system to automatically save profile pictures to Firebase when provided during registration
- **Responsive Timeline Display**: Improved Timeline responsive design with proper container constraints preventing text overflow on small screens
- **Tagging Permission System**: Restricted media tagging so only the person who uploaded media (or admins) can tag others in photos and videos, ensuring proper ownership control
- **Media Grid Alignment**: Fixed media grid alignment in InstagramGallery by adding proper padding to match other content sections
- **Envelope Animation Enhancement**: Replaced broken animated envelope with clean SVG-based envelope and floating heart animation for note posts
- **Spotify Scope Error Handling**: Implemented automatic detection and handling of insufficient Spotify API scope errors with forced re-authentication and user-friendly error messages
- **Instagram 2.0 Music Section Restyling**: Complete redesign of MusicWishlist component with modern glassmorphism effects, gradient backgrounds, purple-pink-orange color scheme, backdrop blur, rounded corners, enhanced visual hierarchy, and Instagram-inspired aesthetic
- **Spotify Green Theme**: Updated music section from purple/pink gradients to Spotify's signature green/emerald/teal color palette throughout all components, buttons, icons, and states
- **Animated Music Icon**: Added subtle bouncing animation to Spotify logo with floating music note particles, pulse effects, and hover interactions for enhanced visual appeal
- **Push Notification System**: Implemented comprehensive notification system with browser push notifications and service worker support for tagged users, comments, and likes - users receive real-time notifications when tagged in photos/videos, when someone comments on their media, or likes their content
- **Upload Option Text Alignment**: Fixed text centering in upload modal options to maintain consistent styling across all upload buttons (photo/video, video recording, notes, stories)

### January 25, 2025 (Sprint Implementation Complete)
- **Dark Mode Background Fix**: Removed all gradient backgrounds from dark mode across all components, implementing flat gray-900 background as requested for modern clean aesthetic
- **Device ID Cleanup System**: Implemented comprehensive Sprint 3 solution for user deletion with complete localStorage clearing and new device ID generation
- **Presence Prevention**: Added userDeleted flag system to prevent deleted users from reappearing through LiveUserIndicator heartbeat updates
- **Complete Data Cleanup**: Enhanced deletion process to remove users from all Firebase collections (live_users, media, comments, likes, stories) and localStorage
- **New Identity Generation**: After self-deletion, users receive completely new device IDs and are treated as fresh visitors with username prompt
- **Tested and Verified**: Confirmed Sprint 3 working correctly with users getting new device IDs after deletion, preventing reappearance in User Management panel
- **Profile Synchronization System**: Implemented automatic profile sync for new visitors - when users connect they immediately see existing profile pictures and display names from all 9+ registered users, ensuring consistent user identification across posts, comments, and live indicators through Firebase profile collection sync
- **Complete Database Cleanup**: Enhanced User Management deletion to remove users from both live_users collection and userProfiles database, ensuring complete data cleanup with no orphaned profile entries when visitors are deleted
- **Unified User Management**: Updated User Management panel to display users from both live_users collection AND userProfiles database, providing complete visibility of all users (active and profile-only) for comprehensive user deletion management
- **Complete User Discovery**: Enhanced User Management to search across live_users, userProfiles, media, and comments collections to find all users who have interacted with the system
- **Profile Picture Sync**: Fixed profile picture synchronization system - user profile pictures display correctly when set, otherwise show default icon with gear overlay for profile editing access
- **Bulk Delete Fixed**: Corrected bulk delete functionality to properly remove users from both live_users collection and userProfiles database with complete content cleanup

### January 26, 2025 (Replit Environment Migration Complete)
- **Replit Agent to Replit Migration**: Successfully migrated wedding gallery app from Replit Agent to Replit environment with full functionality preserved
- **Google Maps API Integration**: Fixed location service by configuring Google Maps API key, enabling accurate local business search in Arnum/Hemmingen area
- **Location Search Verified**: Confirmed location search now properly finds local businesses like EDEKA, restaurants, churches, and shops sorted by distance from user's position
- **Video Thumbnail System Rewritten**: Completely rebuilt video thumbnail system to display actual video frames instead of placeholder icons
- **Native HTML5 Video Thumbnails**: Implemented direct video element approach with automatic seeking to 0.1 seconds for reliable frame display
- **Mobile Video Compatibility**: Enhanced mobile browser support for iPhone and Android with simplified, native video thumbnail generation
- **Real Video Previews**: Videos now show actual content frames in both Instagram Gallery grid and feed views with proper play button overlays
- **Red Video Badge Removal**: Removed red video badges from video thumbnails for cleaner appearance in Instagram Gallery
- **Admin Panel Icon-Only Interface**: Updated all admin buttons to clean icon-only circular design without text labels as requested
- **Admin Logout Button Added**: Added missing logout button (LogOut icon) to admin panel for proper admin mode exit functionality
- **All Core Features Working**: Verified complete app functionality including Firebase integration, live user tracking, media uploads, comments, likes, stories, and music wishlist
- **Security and Performance**: Maintained proper client/server separation, database connections, and all external service integrations during migration

### January 25, 2025 (Migration Complete)
- **Profile Controls Migration**: Moved profile controls (user profile button, admin toggle, and settings gear) from ProfileHeader to top navigation bar next to dark mode toggle for better accessibility
- **Top Bar Control Integration**: Integrated profile management controls into the main header with proper state management and responsive sizing for mobile and desktop
- **Enhanced Gear Icon Visibility**: Improved gear icon overlay on profile button with larger size (3.5/4 units), shadow effects, and better contrast borders to clearly indicate profile editing capability
- **Timeline Heart Animation**: Added soft heartbeat animation to Timeline header Heart icon with 3-second duration for enhanced romantic visual appeal
- **Back to Top Button**: Implemented floating back-to-top button that appears after scrolling 300px with smooth scroll animation and gradient styling
- **Profile Security Enhancement**: Fixed critical security issue preventing admins from editing visitor profiles - users can now only edit their own profiles, with disabled form inputs and clear messaging for unauthorized access attempts
- **User Tagging System**: Implemented comprehensive media tagging functionality allowing users to tag other people in photos and videos with searchable user selection, tag management, and real-time updates through Firebase integration
- **Comment Profile Pictures**: Added profile pictures for comment authors across all components (InstagramPost, NotePost, MediaModal) with consistent avatar system and improved visual hierarchy
- **Replit Environment Migration**: Successfully migrated project from Replit Agent to Replit environment with all core functionality preserved
- **Profile Security Fix**: Fixed profile editing controls to only be visible in admin mode, preventing unauthorized access to profile settings
- **Firebase Error Resolution**: Fixed Firebase updateDoc() error by removing undefined values from profile updates
- **User Profile System**: Added separate visitor profile editing with profile picture button that shows user's actual profile picture when set, or UserPlus icon as fallback, allowing users to set custom display names and profile pictures while keeping the main gallery owner profile (Kristin & Maurizio) completely separate and unmodifiable
- **Admin UI Enhancement**: Improved admin control buttons with consistent circular design, proper spacing, and glassmorphism effects matching the overall design system
- **Profile Text Consistency**: Fixed admin profile editing to display the same name and bio on both the front page header and editing modal, ensuring text consistency throughout the interface
- **Timeline Video Indicators**: Added prominent play button overlay to videos in Timeline component for clear visual distinction between images and videos
- **Timeline Icon Standardization**: Fixed timeline event icons to uniform size with consistent dimensions and proper centering
- **Database Migration**: Successfully migrated backend from in-memory storage to PostgreSQL with Drizzle ORM for persistent data storage
- **Camera Functionality**: Added camera capture component for profile picture selfies with front/rear camera switching and photo preview
- **Profile Enhancement**: Enhanced profile editing with both gallery upload and camera capture options for profile pictures
- **Mobile Optimization**: Enhanced mobile responsiveness with responsive breakpoints, improved touch targets, better spacing on small screens, and mobile-specific CSS optimizations
- **Profile Picture Ring Animation**: Added animated ring glow effect to profile pictures with smooth pulsing animation
- **German Text Fix**: Corrected "Jeden Moment zählt" to "Jeder Moment zählt" in countdown component
- **Animated Wedding Rings**: Replaced static K&M initials with floating wedding rings animation featuring sparkle effects and transparent background
- **Touch Optimization**: Added touch-manipulation class and improved button sizing for better mobile interaction
- **Animated Envelope Avatar**: Replaced static avatar images in note posts with animated envelope and floating heart for enhanced visual appeal
- **Mobile Admin Panel Optimization**: Resized admin panel buttons with responsive padding, smaller icons on mobile, hidden subtitle text on small screens, and improved touch targets for better mobile usability
- **Visitor Profile Pictures**: Implemented custom profile picture system allowing visitors to upload and set personal avatars that display with their uploads and comments, replacing static generated avatars with personalized user profiles
- **Migration Completed**: Successfully migrated project from Replit Agent to Replit environment
- **Mobile-First Responsive Design**: Implemented comprehensive responsive design across all modals, components, and interactive elements with touch-friendly buttons (48px minimum), fluid scaling, mobile-optimized layouts, and proper touch manipulation for seamless mobile experience
- **Timeline Instagram 2.0 Complete**: Fully updated Timeline component with modern glassmorphism styling including backdrop blur effects, gradient backgrounds, rounded corners for header and content areas, improved form inputs with translucent backgrounds, enhanced modal design, and consistent Instagram 2.0 design patterns matching the rest of the application
- **Mobile Optimization**: Enhanced mobile responsiveness across all components with improved touch targets, responsive text sizes, and mobile-first design patterns
- **Profile Picture Animation**: Added subtle pulse and glow animation to profile picture ring for enhanced visual appeal
- **Typo Fix**: Corrected German text from "Jeden Moment zählt" to "Jeder Moment zählt" in countdown component
- **Wedding Ring Animation**: Replaced K&M initials with animated wedding rings featuring floating motion and sparkle effects
- **Upload Modal Z-Index Fix**: Resolved upload popup visibility issue by updating modal z-index hierarchy from conflicting values to z-[99999] and fixed Feed/Grid toggle z-index interference
- **Countdown Instagram 2.0 Redesign**: Updated countdown components with modern glassmorphism effects, gradient text, decorative background elements, hover animations, and enhanced visual hierarchy
- **Timeline Icon Standardization**: Fixed timeline event icons to uniform size with consistent dimensions and proper centering
- **Countdown UI Update**: Redesigned countdown with smaller flipclock-style animation in pink theme for better visual appeal
- **Architecture Analysis**: Documented complete file dependencies and system architecture
- **Application Verified**: Confirmed all core features working including Firebase integration, live user tracking, and gallery functionality
- **UI Fix**: Fixed Feed/Grid toggle buttons to display side by side with explicit flex row layout
- **Countdown Feature**: Added countdown timer functionality to profile system with date/time picker in profile editor and live countdown display in profile header
- **Countdown UI Update**: Redesigned countdown with smaller flipclock-style animation in pink theme for better visual appeal
- **Layout Enhancement**: Implemented side-by-side feed and grid layout when in grid view mode for improved content browsing
- **Dismissible End Message**: Added closable countdown end message with persistent dismissed state saved to Firebase and reset option in profile editor
- **Instagram 2.0 Design**: Complete UI redesign with modern glassmorphism effects, gradient backgrounds, rounded corners, improved spacing, and enhanced visual hierarchy inspired by contemporary social media platforms
- **Timeline Redesign**: Applied Instagram 2.0 styling to Timeline component with glassmorphism cards, gradient timeline dots, backdrop blur effects, and enhanced media gallery
- **Admin Panel UI**: Updated admin buttons to display vertically as rectangular buttons with text labels instead of circular icons
- **Profile Editing**: Added complete profile editing system with picture upload, name, and bio editing
- **Firebase Storage**: Fixed storage permissions for profile picture uploads
- **Security**: Verified proper client/server separation and security practices
- **Database**: Confirmed PostgreSQL schema and Drizzle ORM configuration
- **Firebase**: Validated Firebase integration for real-time features

## User Preferences

### UI/UX Preferences
- Admin panel buttons should be rectangular and arranged vertically (top to bottom)
- Buttons should include both icons and text labels for clarity
- Prefer structured, organized layouts over cramped horizontal arrangements
- Dark mode should use neutral colors (neutral-900/800/700) instead of slate colors for better visual appeal
- Avoid excessive gradients in dark mode, prefer flat colors with good contrast
- Remove all gradient effects (gradient-to-r, from-, to-) in dark mode for cleaner appearance

### UI Components
- **Radix UI**: Unstyled, accessible UI primitives
- **shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: Production bundling for server code

### External Services
- **Firebase Storage**: Media file storage
- **Firebase Firestore**: Real-time database for comments, likes, stories
- **Spotify Web API**: Music playlist integration
- **Neon Database**: PostgreSQL hosting (configured via DATABASE_URL)

## Deployment Strategy

### Development Environment
- **Local Development**: `npm run dev` starts both client and server in development mode
- **Hot Module Replacement**: Vite provides fast HMR for React components
- **TypeScript Compilation**: Real-time type checking during development

### Production Build
- **Client Build**: Vite builds optimized React application to `dist/public`
- **Server Build**: ESBuild bundles server code to `dist/index.js`
- **Static Assets**: Client build serves static files through Express in production

### Replit Configuration
- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Build Process**: `npm run build` creates production-ready assets
- **Runtime**: `npm run start` serves the application in production mode
- **Port Configuration**: Server runs on port 5000, mapped to external port 80

### Environment Variables
- **DATABASE_URL**: PostgreSQL connection string (required)
- **VITE_SPOTIFY_CLIENT_ID**: Spotify application client ID
- **VITE_SPOTIFY_CLIENT_SECRET**: Spotify application secret
- **Firebase Configuration**: Embedded in client code for real-time features

## Changelog

Changelog:
- January 24, 2025. Added Stories upload toggle control in admin panel
- January 24, 2025. Added Gallery and Music Wishlist toggle controls in admin panel
- January 24, 2025. Fixed UUID device ID parsing for proper bulk deletion
- January 24, 2025. Optimized bulk delete for fast parallel processing
- January 24, 2025. Added bulk user deletion with checkboxes and select all
- January 24, 2025. Fixed User Management to show all 37+ visitors with delete functionality
- January 24, 2025. Enhanced User Management with complete delete functionality  
- January 24, 2025. Successfully migrated from Bolt to Replit environment
- June 24, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.