import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import * as shellUtils from '../utils/shell'
import { handler } from './checkSupportedPlatforms.tool'

// Mock the shell utility
jest.mock('../utils/shell', () => ({
  runShellCommand: jest.fn(),
}))

const mockRunShellCommand = shellUtils.runShellCommand as jest.MockedFunction<
  typeof shellUtils.runShellCommand
>

describe('checkSupportedPlatforms handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return both platforms supported when all tools are available', async () => {
    // Mock successful responses for all commands
    mockRunShellCommand
      .mockResolvedValueOnce({ stdout: 'xcrun version 14.0', stderr: '' }) // xcrun --version
      .mockResolvedValueOnce({ stdout: 'adb version 1.0.0', stderr: '' }) // adb --version
      .mockResolvedValueOnce({ stdout: 'emulator version 31.0.0', stderr: '' }) // emulator -version

    const result = await handler()

    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(1)
    expect(result.content[0]?.type).toBe('text')
    expect((result.content[0] as any).text).toBe(
      'Both iOS and Android are supported'
    )

    expect(mockRunShellCommand).toHaveBeenCalledTimes(3)
    expect(mockRunShellCommand).toHaveBeenCalledWith('xcrun --version')
    expect(mockRunShellCommand).toHaveBeenCalledWith('adb --version')
    expect(mockRunShellCommand).toHaveBeenCalledWith('emulator -version')
  })

  it('should return only iOS supported when xcrun is available but Android tools are not', async () => {
    mockRunShellCommand
      .mockResolvedValueOnce({ stdout: 'xcrun version 14.0', stderr: '' }) // xcrun --version
      .mockRejectedValueOnce(new Error('adb: command not found')) // adb --version fails

    const result = await handler()

    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(2)
    expect(result.content[0]?.type).toBe('text')
    expect((result.content[0] as any).text).toBe('Only iOS is supported')
    expect(result.content[1]?.type).toBe('text')
    expect((result.content[1] as any).text).toBe(
      'Install `adb` and `emulator` to add Android support'
    )

    expect(mockRunShellCommand).toHaveBeenCalledTimes(2)
    expect(mockRunShellCommand).toHaveBeenCalledWith('xcrun --version')
    expect(mockRunShellCommand).toHaveBeenCalledWith('adb --version')
  })

  it('should return only Android supported when Android tools are available but xcrun is not', async () => {
    mockRunShellCommand
      .mockRejectedValueOnce(new Error('xcrun: command not found')) // xcrun --version fails
      .mockResolvedValueOnce({ stdout: 'adb version 1.0.0', stderr: '' }) // adb --version
      .mockResolvedValueOnce({ stdout: 'emulator version 31.0.0', stderr: '' }) // emulator -version

    const result = await handler()

    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(2)
    expect(result.content[0]?.type).toBe('text')
    expect((result.content[0] as any).text).toBe('Only Android is supported')
    expect(result.content[1]?.type).toBe('text')
    expect((result.content[1] as any).text).toBe(
      'Install Xcode Command Line Tools to add iOS support'
    )

    expect(mockRunShellCommand).toHaveBeenCalledTimes(3)
    expect(mockRunShellCommand).toHaveBeenCalledWith('xcrun --version')
    expect(mockRunShellCommand).toHaveBeenCalledWith('adb --version')
    expect(mockRunShellCommand).toHaveBeenCalledWith('emulator -version')
  })

  it('should return Android unsupported when adb is available but emulator is not', async () => {
    mockRunShellCommand
      .mockResolvedValueOnce({ stdout: 'xcrun version 14.0', stderr: '' }) // xcrun --version
      .mockResolvedValueOnce({ stdout: 'adb version 1.0.0', stderr: '' }) // adb --version
      .mockRejectedValueOnce(new Error('emulator: command not found')) // emulator -version fails

    const result = await handler()

    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(2)
    expect(result.content[0]?.type).toBe('text')
    expect((result.content[0] as any).text).toBe('Only iOS is supported')
    expect(result.content[1]?.type).toBe('text')
    expect((result.content[1] as any).text).toBe(
      'Install `adb` and `emulator` to add Android support'
    )

    expect(mockRunShellCommand).toHaveBeenCalledTimes(3)
  })

  it('should return Android unsupported when emulator is available but adb is not', async () => {
    mockRunShellCommand
      .mockResolvedValueOnce({ stdout: 'xcrun version 14.0', stderr: '' }) // xcrun --version
      .mockRejectedValueOnce(new Error('adb: command not found')) // adb --version fails

    const result = await handler()

    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(2)
    expect(result.content[0]?.type).toBe('text')
    expect((result.content[0] as any).text).toBe('Only iOS is supported')
    expect(result.content[1]?.type).toBe('text')
    expect((result.content[1] as any).text).toBe(
      'Install `adb` and `emulator` to add Android support'
    )

    expect(mockRunShellCommand).toHaveBeenCalledTimes(2)
  })

  it('should return neither platform supported when no tools are available', async () => {
    mockRunShellCommand
      .mockRejectedValueOnce(new Error('xcrun: command not found')) // xcrun --version fails
      .mockRejectedValueOnce(new Error('adb: command not found')) // adb --version fails

    const result = await handler()

    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(3)
    expect(result.content[0]?.type).toBe('text')
    expect((result.content[0] as any).text).toBe('No platforms are supported')
    expect(result.content[1]?.type).toBe('text')
    expect((result.content[1] as any).text).toBe(
      'Install Xcode Command Line Tools to add iOS support'
    )
    expect(result.content[2]?.type).toBe('text')
    expect((result.content[2] as any).text).toBe(
      'Install `adb` and `emulator` to add Android support'
    )

    expect(mockRunShellCommand).toHaveBeenCalledTimes(2)
    expect(mockRunShellCommand).toHaveBeenCalledWith('xcrun --version')
    expect(mockRunShellCommand).toHaveBeenCalledWith('adb --version')
  })

  it('should handle command execution errors gracefully', async () => {
    // Test when commands throw errors with different error types
    mockRunShellCommand
      .mockRejectedValueOnce(new Error('ENOENT: command not found')) // xcrun fails
      .mockRejectedValueOnce(new Error('Permission denied')) // adb fails

    const result = await handler()

    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(3)
    expect((result.content[0] as any).text).toBe('No platforms are supported')
  })

  it('should have correct CallToolResult structure for all scenarios', async () => {
    // Test the structure is consistent
    mockRunShellCommand
      .mockResolvedValueOnce({ stdout: 'xcrun version 14.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'adb version 1.0.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'emulator version 31.0.0', stderr: '' })

    const result = await handler()

    // Verify it matches CallToolResult interface
    expect(result).toHaveProperty('content')
    expect(Array.isArray(result.content)).toBe(true)
    expect(result.content.every((item: any) => item.type === 'text')).toBe(true)
    expect(result.isError).toBeUndefined() // Should not be set when successful
  })
})
