# Mobile Xray MCP

🔬 **Take screenshots and analyze your mobile apps with AI assistance - right from your IDE.**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

**Privacy First** • **Built by Developers for Developers** • **Works Locally**

## About

I've been building mobile apps for the last 10 years, and one thing that's been consistently challenging without a dedicated UX designer is knowing whether the screens I create are actually user-friendly and intuitive.

Now, this has become dramatically easier. With Mobile Xray MCP, you can ask your favorite AI-powered IDE (Claude, Cursor, Windsurf, VS Code) to take a screenshot of your app and give you instant suggestions on what to improve. No more guessing about UI/UX decisions - get feedback directly in your development workflow.

This tool bridges the gap between development and design by bringing mobile app analysis capabilities directly into your coding environment, making it easier than ever to create polished, user-friendly mobile applications.

## Features

- 🔒 **Privacy First**: All automation happens locally on your machine - your app screenshots and data never leave your device
- ⚡ **Fast**: Direct communication with local simulators and emulators for instant feedback
- 📱 **Cross-Platform**: Supports both iOS simulators and Android emulators
- 🤖 **AI-Powered**: Integrates seamlessly with AI coding assistants for intelligent analysis
- 👨‍💻 **Developer-Focused**: Built by developers who understand the mobile development workflow

## ⚡ Quick Start

**Prerequisites:** Node.js 18+, iOS Simulator or Android Emulator

**Add to your IDE config file:**

```json
{
  "mcpServers": {
    "mobile-xray": {
      "command": "npx",
      "args": ["-y", "@cultivx/mobile-xray-mcp"]
    }
  }
}
```

**Test:** Restart IDE → Start simulator → Ask: `"Take a screenshot of my iOS simulator"`

## Setup Details

### Prerequisites

**System Requirements:**

- **Node.js 18+** (check with `node --version`)
- **macOS 10.15+** (for iOS development)
- **macOS/Windows/Linux** (for Android development)

**For iOS Development:**

- Xcode Command Line Tools: `xcode-select --install`
- Xcode with iOS Simulator support
- At least one iOS Simulator installed

**For Android Development:**

- Android Studio (includes `adb` and `emulator` commands)
- Android SDK tools in your PATH
- At least one Android Virtual Device (AVD) created

**Verify Your Setup:**

```bash
# Test Node.js version
node --version  # Should show v18.0.0 or higher

# Test iOS tools (macOS only)
xcrun simctl list devices | head -5

# Test Android tools
adb version
```

### Setup Instructions

**For Cursor**: See [Cursor MCP Documentation](https://docs.cursor.com/context/model-context-protocol)

**For Claude Desktop**: See [Claude MCP Quickstart](https://modelcontextprotocol.io/quickstart/user)

**For Windsurf**: See [Windsurf MCP Documentation](https://docs.codeium.com/windsurf/mcp)

**For VS Code**: See [VS Code MCP Documentation](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)

> **Note**: This MCP server works with any AI coding assistant that supports the Model Context Protocol.

### Basic Usage

1. **Start your mobile simulator/emulator**
2. **Open your AI chat in your IDE**
3. **Ask for a screenshot**: "Can you take a screenshot of my iOS simulator?"
4. **Get AI analysis**: "What can I improve about this screen's UX?"

## Example Prompts

### Platform & Setup

```
Check which platforms are currently supported by the mobile-xray-mcp on my machine
```

### Accessibility

```
Take a screenshot of my iOS simulator and tell me what accessibility features I should add
```

```
Screenshot my current screen and check if the color contrast meets accessibility standards
```

### UI/UX Feedback

```
Take a screenshot of the current iOS simulator, and find the code that is related to it, then propose some improvements without making any changes
```

```
Take a screenshot of my app and suggest improvements for mobile-first design principles
```

```
Analyze the current screen layout and suggest improvements for better user flow
```

### Change and Verify

```
Make changes and verify your changes work well by taking a screenshot
```

## Troubleshooting & FAQ

**Issues:**

- **"No simulators found"**: Start your simulator with `open -a Simulator` (iOS) or check `adb devices` (Android)
- **MCP not connecting**: Restart your IDE after adding config, verify JSON syntax is correct
- **"Command not found"**: Install Xcode Command Line Tools (`xcode-select --install`) or ensure Android SDK is in PATH

**Common Questions:**

- **Frameworks**: Works with React Native, Flutter, Xamarin, or any app in simulator/emulator
- **Physical devices**: Not yet supported, simulators/emulators only
- **Privacy**: The MCP server operates locally and doesn't collect or send any data. Screenshot images are sent to your AI service by your IDE for analysis
- **Offline**: Screenshots work offline, AI analysis needs internet connection

## Current Features

✅ **Platform Detection**: Automatically checks which mobile platforms are available on your system

✅ **Privacy First**: All processing performed by the MCP server happens locally - no data sent to external servers. However, screenshot images will be sent to your AI service (Claude, ChatGPT, etc.) for analysis, as handled by your IDE's AI agent

✅ **Screenshot Capture**: Take instant screenshots of iOS simulators and Android emulators

✅ **Cross-Platform Support**: Works with both iOS and Android development environments

✅ **IDE Integration**: Seamlessly works with popular AI-powered IDEs and coding assistants

## Next Features

🚧 **Interactive Navigation**: Enable AI assistants to navigate through your app interface

## Contributing

We welcome contributions! Here's how you can help:

1. **Fork** this repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

I'll review all PRs and provide feedback. Whether it's bug fixes, new features, or documentation improvements - all contributions are appreciated!

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/cultivx/mobile-xray-mcp/issues)
- 📖 **Documentation**: [Model Context Protocol Docs](https://modelcontextprotocol.io/)

---

**Made with ❤️ by developers, for developers**
