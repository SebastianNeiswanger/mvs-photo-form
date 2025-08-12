# MVS Photo Form Filler - Claude Documentation

## Project Overview
This is a Linux desktop application built with Tauri (Rust + React/TypeScript) for managing photo order forms. The application interacts with CSV files to track and update player orders for sports photography.

## Tech Stack
- **Backend**: Tauri (Rust) with CSV processing and file operations
- **Frontend**: React + TypeScript + Vite  
- **Package Manager**: Bun
- **CSV Processing**: Hybrid approach (PapaParse + Rust CSV crate)
- **File Operations**: Tauri native file system APIs

## Key Features ✅
- ✅ CSV file import with native Tauri file dialog
- ✅ Interactive photo order form with packages (3x3 grid) and products (5 columns)
- ✅ Team/Player dropdown navigation with proper labels
- ✅ Sequential next/prev buttons with auto-save functionality
- ✅ In-place CSV file updates with automatic backups
- ✅ Real-time name synchronization between form and dropdowns
- ✅ Coach-specific business logic with auto 810T and -C suffix ✅
- ✅ CSV column filtering with proper DD code handling ✅
- ✅ Configurable item definitions for easy updates
- ✅ Comprehensive error handling and logging
- ✅ Compact, responsive UI design

## Current Architecture

### Hybrid CSV Processing
- **File Selection**: Tauri native dialog (`@tauri-apps/plugin-dialog`)
- **File Loading**: Rust backend CSV processing with structured data
- **File Saving**: In-place file updates via Rust with automatic backups
- **State Management**: React frontend with optimized data structures

### Project Structure
```
/
├── src/                    # React frontend source
│   ├── components/         # Reusable UI components
│   ├── rustBackend.ts     # Tauri backend interface
│   ├── csvUtils.ts        # CSV utility functions
│   ├── config.ts          # Item and pricing configuration
│   ├── types.ts           # TypeScript type definitions
│   └── App.tsx            # Main application component
├── src-tauri/             # Tauri Rust backend
│   ├── src/lib.rs         # Main Rust logic and Tauri commands
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── public/                # Static assets
└── CLAUDE.md              # This documentation
```

## Business Logic

### Player Types ✅
- **Coach**: Gets free 810T item, lastname appended with "-C", Coach field = "Y" ✅
- **Regular Player with Orders**: Normal processing ✅
- **Player with No Orders**: Lastname appended with "-N" ✅

### Form Layout ✅
- **Header**: "MVS Photo Form"
- **Navigation**: Team and Player dropdowns with labels, next/prev buttons
- **5-Column Layout**: 
  1. **Player Info**: Name, Phone, Email, Coach checkbox, Total
  2. **Packages**: 3x3 grid (A-DD) with 90px squares
  3. **Products**: Bu, ABa, Ma, AMa, 810, 57, 23, 23x8, Kc, KcS, DD
  4. **Family Variants**: BuF, ABaF, MaF, AMaF, 810F, 57F, 23F, 23x8F, KcF, KcSF, DDF
  5. **Team Variants**: 810T, 57T, DDT

### CSV Format ✅
- Products/Packages stored as comma-separated repeated items (e.g., "810,810,810,810" for qty 4)
- Barcode acts as unique identifier
- Team field used for filtering/grouping
- In-place file updates preserve all existing data
- **Column Assignment**: Only 9 package items (A-H, DD) go to packages column; all other items (products, family, team variants) go to products column
- **DD Code Handling**: Internal DDPa (package) and DDPr (product) both convert to external DD code, filtered by column context

## Item Configuration ✅
Items are centrally configured with:
- Code (e.g., "Bu", "810F")
- Display name (e.g., "Button", "8x10 Family")
- Price (incremental pricing: 1, 2, 3, 4...)
- Category (Package/Product/Family/Team)

## Auto-Save System ✅
- **Triggers**: Team/player dropdown changes, next/prev navigation
- **Method**: In-place CSV file updates via Rust backend
- **Backup**: Automatic timestamped backups before each save
- **Error Handling**: Comprehensive logging and user feedback

## Development Commands
- `bun install` - Install dependencies
- `bun run dev` - Start web development server (limited functionality)
- `bun run build` - Build for production
- `bun run tauri dev` - Run Tauri desktop app in development (recommended)

## System Dependencies (Linux)
Required for Tauri development:
- Rust toolchain
- libwebkit2gtk-4.0-dev
- libgtk-3-dev
- libayatana-appindicator3-dev
- librsvg2-dev

## Current Implementation Status

### ✅ Completed Features
- Tauri app initialization with React/TypeScript
- Native file selection with Tauri dialog
- Rust backend CSV processing with structured data types
- 5-column responsive UI layout
- 3x3 package grid with visual feedback
- Quantity management with +/- buttons (green/red styling)
- Team/player navigation with proper labels
- Auto-save functionality with in-place file updates
- Automatic backup creation
- Real-time name synchronization
- Comprehensive error handling and logging
- TypeScript type safety throughout
- Coach business logic with automatic 810T assignment and -C suffix
- No-order player logic with automatic -N suffix
- CSV column filtering with proper DD code conversion and column assignment

### 🚧 In Progress
- File dialog troubleshooting (Tauri permissions and plugin configuration)

### ⏳ Pending Implementation
- Advanced error recovery
- Performance optimizations for large datasets
- UI/UX final improvements

## Known Issues & Troubleshooting

### File Dialog Issues
If the Tauri file dialog doesn't open:
1. Ensure running `bun run tauri dev` (not `bun dev`)
2. Check console for "Running in Tauri environment: true"
3. Verify Rust compilation succeeds
4. Check Tauri plugin permissions in `tauri.conf.json`

### Dependencies
- All required Tauri plugins are installed and configured
- Rust backend includes csv, chrono, anyhow crates
- Frontend uses modern React patterns with hooks

## Architecture Decisions

### Hybrid Approach Rationale
- **File Selection**: Native Tauri dialog provides better UX than HTML input
- **CSV Processing**: Rust backend ensures reliable file operations and backups
- **State Management**: React frontend maintains UI responsiveness
- **Type Safety**: TypeScript interfaces ensure data consistency across boundaries

### Performance Considerations
- Efficient Map-based player lookups by barcode
- Optimized React re-renders with useCallback hooks
- Minimal data conversion between frontend/backend formats

## Notes for Future Development
- Item definitions designed for easy modification in `config.ts`
- Modular component structure for maintainability
- TypeScript for complete type safety
- Configurable pricing system for easy updates
- Comprehensive logging for debugging and monitoring
- Backup system ensures data safety during development
- Use JS to run the "get csv" functionality, and use rust for as much other backend logic that you can.
- Everything should be done with the intention of the app running as a desktop app, and not in a browser