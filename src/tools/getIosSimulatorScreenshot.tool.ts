import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import fs from 'node:fs/promises'
import z from 'zod'
import { runShellCommand } from '../utils/shell.js'

const inputSchema = z.object({
  udid: z.string().describe('The UDID of the iOS simulator'),
})

const handler = async (
  args: z.infer<typeof inputSchema>
): Promise<CallToolResult> => {
  try {
    const tmpFile = `/tmp/${Date.now()}-${args.udid}.png`
    await runShellCommand(`xcrun simctl io ${args.udid} screenshot ${tmpFile}`)

    const image = await fs.readFile(tmpFile)
    await fs.unlink(tmpFile)

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
    'get_ios_simulator_screenshot',
    'Get a screenshot of the iOS simulator',
    inputSchema.shape,
    {
      readOnlyHint: true,
    },
    handler
  )
}
