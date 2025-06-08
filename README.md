# Appium MCP

A TypeScript open source project with modern tooling and configuration.

## Features

- ✅ **TypeScript** - Full TypeScript support with strict configuration
- ✅ **ES Modules** - Modern module system with extensionless imports
- ✅ **Testing** - Jest testing framework with TypeScript support
- ✅ **Linting** - ESLint with TypeScript rules
- ✅ **Formatting** - Prettier for consistent code style
- ✅ **Path Aliases** - Import from `@/` instead of relative paths
- ✅ **Development** - Hot reload with tsx

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd appium-mcp

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Available Scripts

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build the project for production
- `npm run start` - Run the built project
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint the code
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
src/
├── index.ts          # Main entry point
├── types/           # TypeScript type definitions
│   └── config.ts
└── utils/           # Utility functions
    ├── greeting.ts
    └── greeting.test.ts
```

## Import Without Extensions

This project is configured to support importing TypeScript files without extensions:

```typescript
// ✅ This works
import { greeting } from './utils/greeting';
import { AppConfig } from './types/config';

// ❌ No need for this
import { greeting } from './utils/greeting.ts';
```

## Path Aliases

You can use path aliases for cleaner imports:

```typescript
// ✅ Use aliases
import { greeting } from '@/utils/greeting';
import { AppConfig } from '@/types/config';

// ❌ Instead of relative paths
import { greeting } from '../../../utils/greeting';
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.