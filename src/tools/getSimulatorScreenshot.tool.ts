import { parseXCUIHierarchy } from '@/utils/parsePageSource'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import yaml from 'js-yaml'
import fs from 'node:fs/promises'
import z from 'zod'
import { executeWithRetry, isAppiumRunning } from '../utils/appium'
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

    let pageSource: string | undefined = undefined
    let appiumAvailable = false
    try {
      appiumAvailable = await isAppiumRunning()
      if (appiumAvailable) {
        pageSource = await executeWithRetry(
          args.platform,
          args.deviceId,
          async driver => {
            return await driver.getPageSource()
          }
        )
      }
    } catch {
      // If Appium is not running or page source fails, ignore
      appiumAvailable = false
    }

    const content: Array<
      | { type: 'image'; data: string; mimeType: string }
      | { type: 'text'; text: string }
    > = [
      {
        type: 'image',
        data: image.toString('base64'),
        mimeType: 'image/png',
      },
    ]

    if (appiumAvailable && pageSource) {
      content.push({
        type: 'text',
        text:
          'Page source to get element positions: \n' +
          (args.platform === 'ios'
            ? yaml.dump(parseXCUIHierarchy(pageSource))
            : JSON.stringify(pageSource, null, 2)),
      })
    } else {
      content.push({
        type: 'text',
        text: 'Appium is not running or page source could not be retrieved. Only screenshot is returned.',
      })
    }

    return {
      content,
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
    'Get a screenshot of the simulator, and returns the page source of the current screen if Appium is installed',
    inputSchema.shape,
    {
      readOnlyHint: true,
    },
    handler
  )
}
