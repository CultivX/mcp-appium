import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types'
import z from 'zod'
import { runShellCommand } from '../utils/shell.js'

const inputSchema = z.object({
  state: z
    .enum(['booted', 'available'])
    .optional()
    .describe('The state of the iOS simulator'),
})

const handler = async (
  args: z.infer<typeof inputSchema>
): Promise<CallToolResult> => {
  const { stdout, stderr } = await runShellCommand(
    `xcrun simctl list -j devices ${args.state}`
  )

  process.stderr.write(stdout)
  process.stderr.write(stderr)

  const devices = Object.values(
    (
      JSON.parse(stdout) as {
        devices: Record<
          string,
          {
            name: string
            udid: string
            state: string
          }[]
        >
      }
    ).devices
  ).flat()

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          devices.map(device => ({
            name: device.name,
            udid: device.udid,
            state: device.state,
          }))
        ),
      },
    ],
  }
}

export const withIosSimulatorListTool = (server: McpServer) => {
  server.tool(
    'get_ios_simulator_list',
    'Get a list of all iOS simulators',
    inputSchema.shape,
    {
      readOnlyHint: true,
    },
    handler
  )
}
