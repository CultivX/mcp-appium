import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import * as shellUtils from '../utils/shell'
import { handler } from './getSimulatorList'

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
            deviceId: 'ABC123-DEF456',
            state: 'booted',
            platform: 'ios',
          },
          {
            name: 'iPhone 15',
            deviceId: 'GHI789-JKL012',
            state: 'available',
            platform: 'ios',
          },
        ],
        'iOS 16.0': [
          {
            name: 'iPad Air',
            deviceId: 'MNO345-PQR678',
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
          deviceId: 'Pixel_7_API_34',
          state: 'booted',
          platform: 'android',
        },
        {
          name: 'Pixel_Tablet_API_34',
          deviceId: 'Pixel_Tablet_API_34',
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
      expect(devices[1].state).toBe('available') // Others are available
      expect(devices[2].state).toBe('available')
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
