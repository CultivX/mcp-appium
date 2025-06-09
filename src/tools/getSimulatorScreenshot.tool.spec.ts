import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import fs from 'node:fs/promises'
import * as shellUtils from '../utils/shell'
import { handler } from './getSimulatorScreenshot.tool'

// Mock the dependencies
jest.mock('../utils/shell', () => ({
  runShellCommand: jest.fn(),
}))

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  unlink: jest.fn(),
}))

const mockRunShellCommand = shellUtils.runShellCommand as jest.MockedFunction<
  typeof shellUtils.runShellCommand
>
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>
const mockUnlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>

describe('getSimulatorScreenshot handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock Date.now() for consistent tmp file names
    jest.spyOn(Date, 'now').mockReturnValue(1234567890)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('iOS platform', () => {
    const iosArgs = {
      platform: 'ios' as const,
      deviceId: 'ABC123-DEF456-GHI789',
    }

    it('should take iOS screenshot successfully', async () => {
      const mockImageBuffer = Buffer.from('fake-png-data', 'utf8')

      mockRunShellCommand.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      })
      mockReadFile.mockResolvedValueOnce(mockImageBuffer)
      mockUnlink.mockResolvedValueOnce(undefined)

      const result = await handler(iosArgs)

      expect(mockRunShellCommand).toHaveBeenCalledWith(
        'xcrun simctl io ABC123-DEF456-GHI789 screenshot /tmp/1234567890-ABC123-DEF456-GHI789.png'
      )
      expect(mockReadFile).toHaveBeenCalledWith(
        '/tmp/1234567890-ABC123-DEF456-GHI789.png'
      )
      expect(mockUnlink).toHaveBeenCalledWith(
        '/tmp/1234567890-ABC123-DEF456-GHI789.png'
      )

      expect(result.isError).toBeUndefined()
      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toEqual({
        type: 'image',
        data: mockImageBuffer.toString('base64'),
        mimeType: 'image/png',
      })
    })

    it('should handle iOS screenshot command failure', async () => {
      mockRunShellCommand.mockRejectedValueOnce(
        new Error('xcrun command failed')
      )

      const result = await handler(iosArgs)

      expect(result.isError).toBe(true)
      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'xcrun command failed',
      })

      // Should not attempt file operations on command failure
      expect(mockReadFile).not.toHaveBeenCalled()
      expect(mockUnlink).not.toHaveBeenCalled()
    })

    it('should handle iOS file read failure', async () => {
      mockRunShellCommand.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      })
      mockReadFile.mockRejectedValueOnce(new Error('File not found'))

      const result = await handler(iosArgs)

      expect(result.isError).toBe(true)
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'File not found',
      })

      expect(mockUnlink).not.toHaveBeenCalled()
    })

    it('should clean up tmp file even if unlink fails', async () => {
      const mockImageBuffer = Buffer.from('fake-png-data', 'utf8')

      mockRunShellCommand.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      })
      mockReadFile.mockResolvedValueOnce(mockImageBuffer)
      mockUnlink.mockRejectedValueOnce(new Error('Permission denied'))

      const result = await handler(iosArgs)

      // Should still return the image despite unlink failure
      expect(result.isError).toBeUndefined()
      expect(result.content[0]).toEqual({
        type: 'image',
        data: mockImageBuffer.toString('base64'),
        mimeType: 'image/png',
      })
    })
  })

  describe('Android platform', () => {
    const androidArgs = {
      platform: 'android' as const,
      deviceId: 'emulator-5554',
    }

    it('should take Android screenshot successfully', async () => {
      const mockImageBuffer = Buffer.from('fake-android-png-data', 'utf8')

      mockRunShellCommand.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      })
      mockReadFile.mockResolvedValueOnce(mockImageBuffer)
      mockUnlink.mockResolvedValueOnce(undefined)

      const result = await handler(androidArgs)

      expect(mockRunShellCommand).toHaveBeenCalledWith(
        'adb -s emulator-5554 exec-out screencap -p > /tmp/1234567890-emulator-5554.png'
      )
      expect(mockReadFile).toHaveBeenCalledWith(
        '/tmp/1234567890-emulator-5554.png'
      )
      expect(mockUnlink).toHaveBeenCalledWith(
        '/tmp/1234567890-emulator-5554.png'
      )

      expect(result.isError).toBeUndefined()
      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toEqual({
        type: 'image',
        data: mockImageBuffer.toString('base64'),
        mimeType: 'image/png',
      })
    })

    it('should handle Android screenshot command failure', async () => {
      mockRunShellCommand.mockRejectedValueOnce(
        new Error('adb device not found')
      )

      const result = await handler(androidArgs)

      expect(result.isError).toBe(true)
      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'adb device not found',
      })
    })

    it('should handle Android with physical device ID', async () => {
      const physicalDeviceArgs = {
        platform: 'android' as const,
        deviceId: 'R58M30XXXXXX',
      }
      const mockImageBuffer = Buffer.from('physical-device-screenshot', 'utf8')

      mockRunShellCommand.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      })
      mockReadFile.mockResolvedValueOnce(mockImageBuffer)
      mockUnlink.mockResolvedValueOnce(undefined)

      const result = await handler(physicalDeviceArgs)

      expect(mockRunShellCommand).toHaveBeenCalledWith(
        'adb -s R58M30XXXXXX exec-out screencap -p > /tmp/1234567890-R58M30XXXXXX.png'
      )
      expect(result.isError).toBeUndefined()
    })
  })

  describe('Error handling', () => {
    it('should handle unknown error types', async () => {
      const args = {
        platform: 'ios' as const,
        deviceId: 'test-device',
      }

      // Mock an error without a message property
      mockRunShellCommand.mockRejectedValueOnce({ error: 'Some weird error' })

      const result = await handler(args)

      expect(result.isError).toBe(true)
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Unknown error',
      })
    })

    it('should handle empty error message', async () => {
      const args = {
        platform: 'android' as const,
        deviceId: 'emulator-5554',
      }

      mockRunShellCommand.mockRejectedValueOnce(new Error(''))

      const result = await handler(args)

      expect(result.isError).toBe(true)
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Unknown error',
      })
    })
  })

  describe('File system operations', () => {
    it('should generate unique temporary file names', async () => {
      const args1 = { platform: 'ios' as const, deviceId: 'device1' }
      const args2 = { platform: 'android' as const, deviceId: 'device2' }

      // Mock different timestamps
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1111111111)
        .mockReturnValueOnce(2222222222)

      mockRunShellCommand.mockResolvedValue({ stdout: '', stderr: '' })
      mockReadFile.mockResolvedValue(Buffer.from('test', 'utf8'))
      mockUnlink.mockResolvedValue(undefined)

      await handler(args1)
      await handler(args2)

      expect(mockRunShellCommand).toHaveBeenNthCalledWith(
        1,
        'xcrun simctl io device1 screenshot /tmp/1111111111-device1.png'
      )
      expect(mockRunShellCommand).toHaveBeenNthCalledWith(
        2,
        'adb -s device2 exec-out screencap -p > /tmp/2222222222-device2.png'
      )
    })

    it('should handle base64 encoding correctly', async () => {
      const args = { platform: 'ios' as const, deviceId: 'test-device' }
      const originalData = 'Hello, World!'
      const mockImageBuffer = Buffer.from(originalData, 'utf8')
      const expectedBase64 = mockImageBuffer.toString('base64')

      mockRunShellCommand.mockResolvedValueOnce({ stdout: '', stderr: '' })
      mockReadFile.mockResolvedValueOnce(mockImageBuffer)
      mockUnlink.mockResolvedValueOnce(undefined)

      const result = await handler(args)

      expect(result.content[0]).toEqual({
        type: 'image',
        data: expectedBase64,
        mimeType: 'image/png',
      })

      // Verify the base64 can be decoded back to original
      const decodedData = Buffer.from(expectedBase64, 'base64').toString('utf8')
      expect(decodedData).toBe(originalData)
    })
  })

  describe('Input validation edge cases', () => {
    it('should handle special characters in device IDs', async () => {
      const args = {
        platform: 'ios' as const,
        deviceId: 'ABC-123_DEF.456',
      }

      mockRunShellCommand.mockResolvedValueOnce({ stdout: '', stderr: '' })
      mockReadFile.mockResolvedValueOnce(Buffer.from('test', 'utf8'))
      mockUnlink.mockResolvedValueOnce(undefined)

      const result = await handler(args)

      expect(mockRunShellCommand).toHaveBeenCalledWith(
        'xcrun simctl io ABC-123_DEF.456 screenshot /tmp/1234567890-ABC-123_DEF.456.png'
      )
      expect(result.isError).toBeUndefined()
    })

    it('should handle very long device IDs', async () => {
      const longDeviceId = 'a'.repeat(100)
      const args = {
        platform: 'android' as const,
        deviceId: longDeviceId,
      }

      mockRunShellCommand.mockResolvedValueOnce({ stdout: '', stderr: '' })
      mockReadFile.mockResolvedValueOnce(Buffer.from('test', 'utf8'))
      mockUnlink.mockResolvedValueOnce(undefined)

      const result = await handler(args)

      expect(mockRunShellCommand).toHaveBeenCalledWith(
        `adb -s ${longDeviceId} exec-out screencap -p > /tmp/1234567890-${longDeviceId}.png`
      )
      expect(result.isError).toBeUndefined()
    })
  })
})
