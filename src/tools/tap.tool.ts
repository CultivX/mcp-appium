import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import z from 'zod'
import { executeWithRetry, isAppiumRunning } from '../utils/appium'

const inputSchema = z.object({
  platform: z
    .enum(['ios', 'android'])
    .describe('The platform of the simulator'),
  deviceId: z
    .string()
    .describe(
      'The UDID for the iOS simulator, and the emulator ID for the Android simulator'
    ),
  x: z.number().describe('The x-coordinate to tap'),
  y: z.number().describe('The y-coordinate to tap'),
})

export const handler = async (
  args: z.infer<typeof inputSchema>
): Promise<CallToolResult> => {
  try {
    const appiumAvailable = await isAppiumRunning()
    if (!appiumAvailable) {
      return {
        content: [
          {
            type: 'text',
            text: 'This tool requires Appium to be running. Please start Appium and try again.',
          },
        ],
        isError: true,
      }
    }

    const result = await executeWithRetry(
      args.platform,
      args.deviceId,
      async driver => {
        // Use the action API for tapping
        await driver
          .action('pointer')
          .move({ x: args.x, y: args.y })
          .down()
          .up()
          .perform()

        return `Tapped at (${args.x}, ${args.y})`
      }
    )

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    }
  } catch (err: unknown) {
    const error = err as Error

    return {
      content: [
        {
          type: 'text',
          text: error.message || 'Unknown error',
        },
      ],
      isError: true,
    }
  }
}

export const withTapTool = (server: McpServer) => {
  server.tool(
    'tap',
    'Tap on the simulator screen at a given coordinate',
    inputSchema.shape,
    handler
  )
}
