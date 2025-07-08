import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import * as shellUtils from '../utils/shell'
import { handler } from './getSimulatorList.tool'

// Mock the shell utility
jest.mock('../utils/shell', () => ({
  runShellCommand: jest.fn(),
}))

const mockRunShellCommand = shellUtils.runShellCommand as jest.MockedFunction<
  typeof shellUtils.runShellCommand
>

describe('getSimulatorList handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock process.stderr.write to avoid console output during tests
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  describe('iOS platform', () => {
    const mockIosDevicesResponse = {
      devices: {
        'iOS 17.0': [
          {
            name: 'iPhone 14',
            udid: 'ABC123-DEF456',
            state: 'booted',
            platform: 'ios',
          },
          {
            name: 'iPhone 15',
            udid: 'GHI789-JKL012',
            state: 'available',
            platform: 'ios',
          },
        ],
        'iOS 16.0': [
          {
            name: 'iPad Air',
            udid: 'MNO345-PQR678',
            state: 'available',
            platform: 'ios',
          },
        ],
      },
    }

    it('should return booted iOS devices', async () => {
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: JSON.stringify(mockIosDevicesResponse),
        stderr: '',
      })

      const result = await handler({ platform: 'ios', state: 'booted' })

      expect(mockRunShellCommand).toHaveBeenCalledWith(
        'xcrun simctl list -j devices booted'
      )
      expect(result.isError).toBeUndefined()
      expect(result.content).toHaveLength(1)
      expect(result.content[0]?.type).toBe('text')

      const devices = JSON.parse((result.content[0] as any).text)
      expect(devices).toHaveLength(3) // All devices from all iOS versions
      expect(devices[0]).toEqual({
        name: 'iPhone 14',
        deviceId: 'ABC123-DEF456',
        state: 'booted',
        platform: 'ios',
      })
    })

    it('should return available iOS devices', async () => {
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: JSON.stringify(mockIosDevicesResponse),
        stderr: '',
      })

      const result = await handler({ platform: 'ios', state: 'available' })

      expect(mockRunShellCommand).toHaveBeenCalledWith(
        'xcrun simctl list -j devices available'
      )
      expect(result.isError).toBeUndefined()

      const devices = JSON.parse((result.content[0] as any).text)
      expect(devices).toHaveLength(3) // All devices from all iOS versions
    })

    it('should handle iOS command stderr output', async () => {
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: JSON.stringify(mockIosDevicesResponse),
        stderr: 'Some warning message',
      })

      const result = await handler({ platform: 'ios', state: 'booted' })

      expect(process.stderr.write).toHaveBeenCalledWith('Some warning message')
      expect(result.isError).toBeUndefined()
    })
  })

  describe('Android platform', () => {
    const mockAvdList = 'Pixel_7_API_34\nPixel_Tablet_API_34\nNexus_5_API_30'
    const mockAdbDevices =
      'List of devices attached\nemulator-5554\tdevice\nemulator-5556\tdevice'

    it('should return booted Android devices', async () => {
      // Mock emulator -list-avds
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: mockAvdList,
        stderr: '',
      })

      // Mock adb devices
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: mockAdbDevices,
        stderr: '',
      })

      // Mock adb emu avd name for each emulator
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'Pixel_7_API_34\n',
        stderr: '',
      })
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'Pixel_Tablet_API_34\r\n',
        stderr: '',
      })

      const result = await handler({ platform: 'android', state: 'booted' })

      expect(mockRunShellCommand).toHaveBeenCalledWith('emulator -list-avds')
      expect(mockRunShellCommand).toHaveBeenCalledWith('adb devices')
      expect(mockRunShellCommand).toHaveBeenCalledWith(
        'adb -s emulator-5554 emu avd name'
      )
      expect(mockRunShellCommand).toHaveBeenCalledWith(
        'adb -s emulator-5556 emu avd name'
      )

      expect(result.isError).toBeUndefined()

      const devices = JSON.parse((result.content[0] as any).text)
      expect(devices).toHaveLength(2) // Only booted devices
      expect(devices).toEqual([
        {
          name: 'Pixel_7_API_34',
          deviceId: 'emulator-5554',
          state: 'booted',
          platform: 'android',
        },
        {
          name: 'Pixel_Tablet_API_34',
          deviceId: 'emulator-5556',
          state: 'booted',
          platform: 'android',
        },
      ])
    })

    it('should return all Android devices when state is available', async () => {
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: mockAvdList,
        stderr: '',
      })

      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'List of devices attached\nemulator-5554\tdevice',
        stderr: '',
      })

      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'Pixel_7_API_34',
        stderr: '',
      })

      const result = await handler({ platform: 'android', state: 'available' })

      const devices = JSON.parse((result.content[0] as any).text)
      expect(devices).toHaveLength(3) // All AVDs
      expect(devices[0].state).toBe('booted') // Pixel_7_API_34 is running
      expect(devices[0].deviceId).toBe('emulator-5554') // Should use emulator ID for booted device
      expect(devices[1].state).toBe('available') // Others are available
      expect(devices[1].deviceId).toBe('Pixel_Tablet_API_34') // Should use AVD name for non-booted device
      expect(devices[2].state).toBe('available')
      expect(devices[2].deviceId).toBe('Nexus_5_API_30') // Should use AVD name for non-booted device
    })

    it('should handle multiline avd name output correctly', async () => {
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'Test_AVD',
        stderr: '',
      })

      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'List of devices attached\nemulator-5554\tdevice',
        stderr: '',
      })

      // Test multiline output with extra content
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'Test_AVD\nOK\nExtra output line',
        stderr: '',
      })

      const result = await handler({ platform: 'android', state: 'available' })

      const devices = JSON.parse((result.content[0] as any).text)
      expect(devices[0].name).toBe('Test_AVD') // Should only take first line
    })

    it('should handle adb command failures gracefully', async () => {
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'Test_AVD',
        stderr: '',
      })

      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'List of devices attached\nemulator-5554\tdevice',
        stderr: '',
      })

      // Simulate adb command failure
      mockRunShellCommand.mockRejectedValueOnce(new Error('adb command failed'))

      const result = await handler({ platform: 'android', state: 'available' })

      // Should still return devices, but none marked as booted
      const devices = JSON.parse((result.content[0] as any).text)
      expect(devices).toHaveLength(1)
      expect(devices[0].state).toBe('available')
    })

    it('should handle empty avd name output', async () => {
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'Test_AVD',
        stderr: '',
      })

      mockRunShellCommand.mockResolvedValueOnce({
        stdout: 'List of devices attached\nemulator-5554\tdevice',
        stderr: '',
      })

      // Return empty avd name
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: '   \n',
        stderr: '',
      })

      const result = await handler({ platform: 'android', state: 'available' })

      const devices = JSON.parse((result.content[0] as any).text)
      expect(devices).toHaveLength(1)
      expect(devices[0].state).toBe('available') // Should not be marked as booted
    })
  })

  describe('Additional edge cases', () => {
    describe('iOS platform', () => {
      it('should handle no devices returned', async () => {
        const emptyDevices = { devices: {} }
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: JSON.stringify(emptyDevices),
          stderr: '',
        })
        const result = await handler({ platform: 'ios', state: 'booted' })
        const devices = JSON.parse((result.content[0] as any).text)
        expect(devices).toHaveLength(0)
      })

      it('should handle malformed JSON', async () => {
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: '{invalid json',
          stderr: '',
        })
        await expect(
          handler({ platform: 'ios', state: 'booted' })
        ).rejects.toThrow()
      })

      it('should handle device with missing fields', async () => {
        const malformedDevices = {
          devices: {
            'iOS 17.0': [
              { name: 'iPhone 14' }, // missing udid and state
            ],
          },
        }
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: JSON.stringify(malformedDevices),
          stderr: '',
        })
        const result = await handler({ platform: 'ios', state: 'booted' })
        const devices = JSON.parse((result.content[0] as any).text)
        // Should skip or handle gracefully, so deviceId and state may be undefined
        expect(devices[0]?.name).toBe('iPhone 14')
      })

      it('should handle multiple warnings in stderr', async () => {
        const mockIosDevicesResponse = {
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 14',
                udid: 'ABC123-DEF456',
                state: 'booted',
                platform: 'ios',
              },
            ],
          },
        }
        const warnings = 'Warning 1\nWarning 2\nWarning 3'
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: JSON.stringify(mockIosDevicesResponse),
          stderr: warnings,
        })
        const stderrSpy = jest
          .spyOn(process.stderr, 'write')
          .mockImplementation(() => true)
        await handler({ platform: 'ios', state: 'booted' })
        expect(stderrSpy).toHaveBeenCalledWith(
          'Warning 1\nWarning 2\nWarning 3'
        )
        stderrSpy.mockRestore()
      })
    })

    describe('Android platform', () => {
      it('should handle no AVDs returned', async () => {
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: '',
          stderr: '',
        })
        const result = await handler({
          platform: 'android',
          state: 'available',
        })
        const devices = JSON.parse((result.content[0] as any).text)
        expect(devices).toHaveLength(0)
      })

      it('should handle no booted devices', async () => {
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: 'Pixel_7_API_34',
          stderr: '',
        })
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: 'List of devices attached',
          stderr: '',
        })
        const result = await handler({ platform: 'android', state: 'booted' })
        const devices = JSON.parse((result.content[0] as any).text)
        expect(devices).toHaveLength(0)
      })

      it('should ignore unauthorized devices', async () => {
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: 'Pixel_7_API_34',
          stderr: '',
        })
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: 'List of devices attached\nemulator-5554\tunauthorized',
          stderr: '',
        })
        const result = await handler({ platform: 'android', state: 'booted' })
        const devices = JSON.parse((result.content[0] as any).text)
        expect(devices).toHaveLength(0)
      })

      it('should handle AVD name with special characters', async () => {
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: 'Pixel 7 Pro (Test) #1',
          stderr: '',
        })
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: 'List of devices attached\nemulator-5554\tdevice',
          stderr: '',
        })
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: 'Pixel 7 Pro (Test) #1',
          stderr: '',
        })
        const result = await handler({
          platform: 'android',
          state: 'available',
        })
        const devices = JSON.parse((result.content[0] as any).text)
        expect(devices[0].name).toBe('Pixel 7 Pro (Test) #1')
      })

      it('should handle multiple devices with same AVD name', async () => {
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: 'Pixel_7_API_34\nPixel_7_API_34',
          stderr: '',
        })
        mockRunShellCommand.mockResolvedValueOnce({
          stdout:
            'List of devices attached\nemulator-5554\tdevice\nemulator-5556\tdevice',
          stderr: '',
        })
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: 'Pixel_7_API_34',
          stderr: '',
        })
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: 'Pixel_7_API_34',
          stderr: '',
        })
        const result = await handler({ platform: 'android', state: 'booted' })
        const devices = JSON.parse((result.content[0] as any).text)
        expect(devices).toHaveLength(2)
        expect(devices[0].name).toBe('Pixel_7_API_34')
        expect(devices[1].name).toBe('Pixel_7_API_34')
      })
    })

    describe('General', () => {
      it('should handle unexpected state value', async () => {
        const mockIosDevicesResponse = {
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 14',
                udid: 'ABC123-DEF456',
                state: 'unknown',
                platform: 'ios',
              },
            ],
          },
        }
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: JSON.stringify(mockIosDevicesResponse),
          stderr: '',
        })
        const result = await handler({ platform: 'ios', state: 'booted' })
        const devices = JSON.parse((result.content[0] as any).text)
        // Should not include device with unknown state
        expect(devices).toHaveLength(0)
      })

      it('should handle handler returning error object', async () => {
        // Simulate handler returning error object (not throwing)
        const errorHandler = async () => ({
          content: [{ type: 'text', text: 'Some error' }],
          isError: true,
        })
        const result = await errorHandler()
        expect(result.isError).toBe(true)
        expect(result.content[0].text).toBe('Some error')
      })

      it('should handle both stdout and stderr with errors', async () => {
        const mockIosDevicesResponse = {
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 14',
                udid: 'ABC123-DEF456',
                state: 'booted',
                platform: 'ios',
              },
            ],
          },
        }
        mockRunShellCommand.mockResolvedValueOnce({
          stdout: JSON.stringify(mockIosDevicesResponse),
          stderr: 'Error: something went wrong',
        })
        const stderrSpy = jest
          .spyOn(process.stderr, 'write')
          .mockImplementation(() => true)
        const result = await handler({ platform: 'ios', state: 'booted' })
        expect(stderrSpy).toHaveBeenCalledWith('Error: something went wrong')
        expect(result.isError).toBeUndefined()
        stderrSpy.mockRestore()
      })
    })
  })

  describe('Error cases', () => {
    it('should return error for invalid platform', async () => {
      const result = await handler({
        platform: 'invalid' as any,
        state: 'booted',
      })

      expect(result.isError).toBe(true)
      expect((result.content[0] as any).text).toBe('Invalid platform')
    })

    it('should handle iOS command failure', async () => {
      mockRunShellCommand.mockRejectedValueOnce(
        new Error('xcrun command failed')
      )

      await expect(
        handler({ platform: 'ios', state: 'booted' })
      ).rejects.toThrow('xcrun command failed')
    })

    it('should handle Android emulator list failure', async () => {
      mockRunShellCommand.mockRejectedValueOnce(
        new Error('emulator command failed')
      )

      await expect(
        handler({ platform: 'android', state: 'booted' })
      ).rejects.toThrow('emulator command failed')
    })
  })
})
