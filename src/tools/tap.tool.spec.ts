import { executeWithRetry } from '../utils/appium'
import { handler } from './tap.tool'

jest.mock('../utils/appium')

const mockExecuteWithRetry = jest.mocked(executeWithRetry)

describe('tap handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should perform tap action on iOS platform', async () => {
    const mockResult = 'Tapped at (100, 200)'
    mockExecuteWithRetry.mockResolvedValue(mockResult)

    const result = await handler({
      platform: 'ios',
      deviceId: 'test-ios-device',
      x: 100,
      y: 200,
    })

    expect(mockExecuteWithRetry).toHaveBeenCalledWith(
      'ios',
      'test-ios-device',
      expect.any(Function)
    )
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: mockResult,
        },
      ],
    })
  })

  it('should perform tap action on Android platform', async () => {
    const mockResult = 'Tapped at (50, 150)'
    mockExecuteWithRetry.mockResolvedValue(mockResult)

    const result = await handler({
      platform: 'android',
      deviceId: 'test-android-device',
      x: 50,
      y: 150,
    })

    expect(mockExecuteWithRetry).toHaveBeenCalledWith(
      'android',
      'test-android-device',
      expect.any(Function)
    )
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: mockResult,
        },
      ],
    })
  })

  it('should handle errors and return error response', async () => {
    const mockError = new Error('Tap failed')
    mockExecuteWithRetry.mockRejectedValue(mockError)

    const result = await handler({
      platform: 'ios',
      deviceId: 'test-device',
      x: 100,
      y: 200,
    })

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Tap failed',
        },
      ],
      isError: true,
    })
  })

  it('should handle unknown errors', async () => {
    mockExecuteWithRetry.mockRejectedValue('Unknown error')

    const result = await handler({
      platform: 'ios',
      deviceId: 'test-device',
      x: 100,
      y: 200,
    })

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Unknown error',
        },
      ],
      isError: true,
    })
  })

  it('should call the driver action API correctly', async () => {
    const mockAction = {
      move: jest.fn().mockReturnThis(),
      down: jest.fn().mockReturnThis(),
      up: jest.fn().mockReturnThis(),
      perform: jest.fn().mockResolvedValue(undefined),
    }

    const mockDriver = {
      action: jest.fn().mockReturnValue(mockAction),
    }

    mockExecuteWithRetry.mockImplementation(async (platform, deviceId, operation) => {
      return await operation(mockDriver as any)
    })

    await handler({
      platform: 'ios',
      deviceId: 'test-device',
      x: 150,
      y: 250,
    })

    expect(mockDriver.action).toHaveBeenCalledWith('pointer')
    expect(mockAction.move).toHaveBeenCalledWith({ x: 150, y: 250 })
    expect(mockAction.down).toHaveBeenCalledTimes(1)
    expect(mockAction.up).toHaveBeenCalledTimes(1)
    expect(mockAction.perform).toHaveBeenCalledTimes(1)
  })

  it('should handle floating point coordinates', async () => {
    const mockResult = 'Tapped at (123.5, 456.7)'
    mockExecuteWithRetry.mockResolvedValue(mockResult)

    const result = await handler({
      platform: 'android',
      deviceId: 'test-device',
      x: 123.5,
      y: 456.7,
    })

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: mockResult,
        },
      ],
    })
  })
})