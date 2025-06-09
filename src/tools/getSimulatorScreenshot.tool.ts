import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import fs from 'node:fs/promises'
import z from 'zod'
import { runShellCommand } from '../utils/shell'

const inputSchema = z.object({
  platform: z
    .enum(['ios', 'android'])
    .describe('The platform of the simulator'),
  deviceId: z
    .string()
    .describe(
      'The UDID for the iOS simulator, and the emulator ID for the Android simulator'
    ),
})

export const handler = async (
  args: z.infer<typeof inputSchema>
): Promise<CallToolResult> => {
  try {
    const tmpFile = `/tmp/${Date.now()}-${args.deviceId}.png`
    if (args.platform === 'ios') {
      await runShellCommand(
        `xcrun simctl io ${args.deviceId} screenshot ${tmpFile}`
      )
    } else {
      await runShellCommand(
        `adb -s ${args.deviceId} exec-out screencap -p > ${tmpFile}`
      )
    }

    const image = await fs.readFile(tmpFile)

    // Try to clean up the tmp file, but don't fail if it can't be deleted
    try {
      await fs.unlink(tmpFile)
    } catch {
      // Ignore cleanup errors
    }

    return {
      content: [
        {
          type: 'image',
          data: image.toString('base64'),
          mimeType: 'image/png',
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

export const withIosSimulatorScreenshotTool = (server: McpServer) => {
  server.tool(
    'get_simulator_screenshot',
    'Get a screenshot of the iOS simulator',
    inputSchema.shape,
    {
      readOnlyHint: true,
    },
    handler
  )
}
