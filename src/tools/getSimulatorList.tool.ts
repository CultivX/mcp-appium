import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types'
import z from 'zod'
import { runShellCommand } from '../utils/shell'

const inputSchema = z.object({
  platform: z
    .enum(['ios', 'android'])
    .describe('The platform of the simulator'),
  state: z.enum(['booted', 'available']).describe('The state of the simulator'),
})

type InputType = z.infer<typeof inputSchema>

export const handler = async (args: InputType): Promise<CallToolResult> => {
  let devices: {
    name: string
    deviceId: string
    state: string
    platform: InputType['platform']
  }[] = []

  if (args.platform === 'ios') {
    const { stdout, stderr } = await runShellCommand(
      `xcrun simctl list -j devices ${args.state}`
    )
    process.stderr.write(stderr)

    devices = Object.values(
      (
        JSON.parse(stdout) as {
          devices: Record<
            string,
            {
              name: string
              udid: string
              state: string
              platform: 'ios'
            }[]
          >
        }
      ).devices
    )
      .flat()
      .map(device => ({
        name: device.name,
        deviceId: device.udid,
        state: device.state,
        platform: 'ios',
      }))
  } else if (args.platform === 'android') {
    // Get all Android virtual devices
    const { stdout: avdsOutput, stderr: avdsStderr } =
      await runShellCommand(`emulator -list-avds`)
    process.stderr.write(avdsStderr)

    const allAvds = avdsOutput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const { stdout: adbOutput, stderr: adbStderr } =
      await runShellCommand('adb devices')
    process.stderr.write(adbStderr)

    const emulatorLines = adbOutput
      .split('\n')
      .filter(line => line.startsWith('emulator-'))
      .map(line => line.split('\t')[0])

    // 3. Map emulator IDs to AVD names
    const runningAvds: Map<string, string | undefined> = new Map() // AVD name -> emulator ID

    for (const emulatorId of emulatorLines) {
      try {
        const { stdout: avdName, stderr: avdNameStderr } =
          await runShellCommand(`adb -s ${emulatorId} emu avd name`)
        process.stderr.write(avdNameStderr)

        const name = avdName.split(/\r?\n/)[0]?.trim()
        if (name) {
          runningAvds.set(name, emulatorId)
        }
      } catch (err) {
        // Skip if command fails (e.g. emulator shutting down)
        continue
      }
    }

    devices = allAvds.map(avd => {
      const emulatorId = runningAvds.get(avd)
      const isBooted = runningAvds.has(avd)
      return {
        name: avd,
        deviceId: emulatorId ?? avd, // Use emulator ID for booted devices, AVD name for available/shutdown
        state: isBooted ? 'booted' : 'available',
        platform: 'android' as const,
      }
    })

    if (args.state === 'booted') {
      devices = devices.filter(device => device.state === 'booted')
    }
  } else {
    return {
      content: [
        {
          type: 'text',
          text: 'Invalid platform',
        },
      ],
      isError: true,
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(devices),
      },
    ],
  }
}

export const withSimulatorListTool = (server: McpServer) => {
  server.tool(
    'get_simulator_list',
    'Get a list of all simulators',
    inputSchema.shape,
    {
      readOnlyHint: true,
    },
    handler
  )
}
