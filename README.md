# MVS Photo Form Filler

A professional desktop application for managing sports photography order forms. Built for photographers and sports organizations to efficiently process player photo orders with automatic data validation, real-time formatting, and seamless CSV file management.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Linux-green.svg)
![Tauri](https://img.shields.io/badge/Tauri-v2-orange.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)

## 🎯 What It Does

MVS Photo Form Filler streamlines the sports photography ordering process by providing:

- **📂 CSV File Management**: Import and edit player roster CSV files with automatic backup creation
- **👥 Player Data Management**: Navigate through teams and players with intuitive dropdowns and navigation controls
- **📦 Order Management**: Handle photo packages (A-H, Digital Downloads) and individual products (prints, buttons, magnets, etc.)
- **👨‍🏫 Coach Logic**: Automatic free item assignment and special handling for coaching staff
- **📱 Contact Validation**: Real-time phone number formatting (converts `1234567890` to `(123) 456-7890`) and email validation
- **💾 Auto-Save**: Automatically saves changes to the original CSV file with backup protection
- **🎨 Professional UI**: Clean, responsive 5-column layout optimized for efficient data entry

## ✨ Key Features

### 🏃‍♂️ Sports Photography Workflow
- **Team-based Organization**: Browse players by team with easy switching
- **Package Grid**: Visual 3x3 grid for photo package selection (A-H + Digital Download)
- **Product Columns**: Organized product selection across multiple categories:
  - Individual products (prints, buttons, magnets, keychains)
  - Family variants (family photo products)
  - Team variants (team photo products)

### 🔧 Data Management
- **In-Place File Updates**: Modifies your original CSV files directly (with backups)
- **Automatic Backups**: Creates timestamped backups before each save
- **Real-time Validation**: Instant feedback for data entry errors
- **Coach Business Logic**: Automatically handles coach-specific rules and pricing

### 💼 Professional Features
- **Phone Formatting**: Auto-formats phone numbers for consistent display
- **Email Validation**: Ensures proper email format with visual feedback
- **Error Handling**: Comprehensive error logging and user feedback
- **Cross-Platform**: Built with Tauri for native desktop performance

## 🛠️ Tech Stack

**Frontend:**
- **React 18** with TypeScript for type-safe UI development
- **Vite** for fast development and optimized builds
- **CSS3** with responsive design and professional styling

**Backend:**
- **Tauri v2** for native desktop functionality
- **Rust** for reliable file operations and CSV processing
- **Native File System APIs** for secure file access

**Data Processing:**
- **PapaParse** for CSV parsing and generation
- **Hybrid processing** model (React UI + Rust backend)
- **Real-time validation** and formatting utilities

## 📋 Requirements

### System Dependencies (Linux)
```bash
# Required for Tauri development
sudo apt install libwebkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Runtime Requirements
- **Node.js** (v18+)
- **Bun** package manager
- **Rust** toolchain (automatically managed by Tauri)

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/MVS-form-filler.git
   cd MVS-form-filler
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Run the development version:**
   ```bash
   bun run tauri dev
   ```

4. **Build for production:**
   ```bash
   bun run build
   ```

## 📖 Usage

1. **Launch the application** and click "📂 Open CSV File"
2. **Select your player roster CSV file** using the native file dialog
3. **Navigate teams and players** using the dropdown menus or arrow buttons
4. **Fill out player information:**
   - Update names, phone numbers (auto-formatted), and email addresses
   - Select photo packages using the visual grid
   - Choose individual products, family variants, and team variants
   - Check "Coach" checkbox for coaching staff (auto-assigns free items)
5. **Auto-save functionality** preserves changes as you navigate between players
6. **Your original CSV file is updated** with all changes (backups are created automatically)

## 📁 CSV File Format

The application expects CSV files with standard player roster columns including:
- Player identification (Barcode, Team, Names, Jersey Number)
- Contact information (Phone, Email, Address fields)
- Photo order columns (Products, Packages)
- Additional fields (Coach status, measurements, etc.)

## 🔧 Development

### Available Commands
```bash
bun install          # Install dependencies
bun run dev          # Start web development server (limited functionality)
bun run build        # Build for production
bun run tauri dev    # Run Tauri desktop app in development (recommended)
```

### Project Structure
```
/
├── src/                    # React frontend source
│   ├── components/         # Reusable UI components
│   ├── rustBackend.ts     # Tauri backend interface
│   ├── csvUtils.ts        # CSV utility functions
│   ├── validation.ts      # Input validation utilities
│   ├── config.ts          # Item and pricing configuration
│   ├── types.ts           # TypeScript type definitions
│   └── App.tsx            # Main application component
├── src-tauri/             # Tauri Rust backend
│   ├── src/lib.rs         # Main Rust logic and Tauri commands
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── public/                # Static assets
├── CLAUDE.md              # Development documentation
└── README.md              # This file
```

### Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Development Notes
- Use `bun run tauri dev` for full desktop functionality
- The web version (`bun run dev`) has limited file system access
- All file operations are handled by the Rust backend for security
- TypeScript provides complete type safety across the application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/) for cross-platform desktop functionality
- Uses [PapaParse](https://www.papaparse.com/) for robust CSV processing
- Developed for sports photography professionals and organizations

## 📞 Support

For questions, issues, or feature requests, please [open an issue](https://github.com/yourusername/MVS-form-filler/issues) on GitHub.
