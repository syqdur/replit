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

## Recent Changes

### January 25, 2025
- **Migration Completed**: Successfully migrated project from Replit Agent to Replit environment
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