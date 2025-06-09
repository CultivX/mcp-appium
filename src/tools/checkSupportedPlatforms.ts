import { runShellCommand } from '@/utils/shell'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { CallToolResult } from '@modelcontextprotocol/sdk/types'

export interface PlatformSupport {
  iosSupported: boolean
  androidSupported: boolean
}

export const handler = async (): Promise<CallToolResult> => {
  // Check iOS support (xcrun)
  let iosSupported = false
  try {
    await runShellCommand('xcrun --version')
    iosSupported = true
  } catch (error) {
    // xcrun not available
    iosSupported = false
  }

  // Check Android support (both adb AND emulator required)
  let androidSupported = false
  try {
    // Check if both adb and emulator are available
    await runShellCommand('adb --version')
    await runShellCommand('emulator -version')
    androidSupported = true
  } catch (error) {
    // Either adb or emulator (or both) not available
    androidSupported = false
  }

  if (iosSupported && androidSupported) {
    return {
      content: [
        {
          type: 'text',
          text: 'Both iOS and Android are supported',
        },
      ],
    }
  } else if (iosSupported) {
    return {
      content: [
        {
          type: 'text',
          text: 'Only iOS is supported',
        },
        {
          type: 'text',
          text: 'Install `adb` and `emulator` to add Android support',
        },
      ],
    }
  } else if (androidSupported) {
    return {
      content: [
        {
          type: 'text',
          text: 'Only Android is supported',
        },
        {
          type: 'text',
          text: 'Install Xcode Command Line Tools to add iOS support',
        },
      ],
    }
  } else {
    return {
      content: [
        {
          type: 'text',
          text: 'No platforms are supported',
        },
        {
          type: 'text',
          text: 'Install Xcode Command Line Tools to add iOS support',
        },
        {
          type: 'text',
          text: 'Install `adb` and `emulator` to add Android support',
        },
      ],
    }
  }
}

export const withCheckSupportedPlatformsTool = (server: McpServer) => {
  server.tool(
    'check_supported_platforms',
    'Check which platforms are supported',
    {},
    {},
    handler
  )
}
