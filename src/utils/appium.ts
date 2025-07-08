import http from 'node:http'
import { remote, type Browser } from 'webdriverio'

const APPIUM_HOST = process.env.APPIUM_HOST || '127.0.0.1'
const APPIUM_PORT = parseInt(process.env.APPIUM_PORT || '4723', 10)
const SESSION_TIMEOUT = parseInt(
  process.env.APPIUM_SESSION_TIMEOUT || '300',
  10
) // 5 minutes default

const driverMap = new Map<string, Browser>()

// Helper function to check if session is valid
const isSessionValid = async (driver: Browser): Promise<boolean> => {
  try {
    // Try to get the current session ID - this is a lightweight check
    const sessionId = driver.sessionId
    if (!sessionId) return false

    // Try to get the current context as a session health check
    await driver.getContext()
    return true
  } catch (error) {
    return false
  }
}

// Helper function to create a new driver
const createDriver = async (
  platform: 'ios' | 'android',
  deviceId: string
): Promise<Browser> => {
  const capabilities =
    platform === 'ios'
      ? {
          platformName: 'iOS',
          'appium:automationName': 'XCUITest',
          'appium:udid': deviceId,
          'appium:noReset': true,
          'appium:newCommandTimeout': SESSION_TIMEOUT,
        }
      : {
          platformName: 'Android',
          'appium:automationName': 'UiAutomator2',
          'appium:udid': deviceId,
          'appium:noReset': true,
          'appium:newCommandTimeout': SESSION_TIMEOUT,
        }

  const driver = await remote({
    protocol: 'http',
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    path: '/',
    capabilities,
  })

  return driver
}

export const getDriver = async (
  platform: 'ios' | 'android',
  deviceId: string
): Promise<Browser> => {
  // Check if we have a cached driver
  if (driverMap.has(deviceId)) {
    const driver = driverMap.get(deviceId)
    if (driver && (await isSessionValid(driver))) {
      return driver
    }
    // Session is invalid, clean up
    try {
      await driver?.deleteSession()
    } catch {
      // Ignore errors during cleanup
    }
    driverMap.delete(deviceId)
  }

  // Create a new driver
  const driver = await createDriver(platform, deviceId)
  driverMap.set(deviceId, driver)

  return driver
}

// Helper function to execute with automatic retry on session expiration
export const executeWithRetry = async <T>(
  platform: 'ios' | 'android',
  deviceId: string,
  operation: (driver: Browser) => Promise<T>,
  maxRetries: number = 2
): Promise<T> => {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const driver = await getDriver(platform, deviceId)
      return await operation(driver)
    } catch (error: any) {
      lastError = error

      // Check if it's a session-related error
      if (
        error.message?.includes('session') ||
        error.message?.includes('terminated') ||
        error.message?.includes('not started')
      ) {
        // Force remove the cached driver
        driverMap.delete(deviceId)
        // Continue to retry
      } else {
        // Not a session error, throw immediately
        throw error
      }
    }
  }

  // All retries failed
  throw lastError || new Error('All retry attempts failed')
}

export const isAppiumRunning = async (): Promise<boolean> => {
  return new Promise(resolve => {
    const req = http.request(
      {
        hostname: APPIUM_HOST,
        port: APPIUM_PORT,
        path: '/status',
        method: 'GET',
        timeout: 2000,
      },
      res => {
        let data = ''
        res.on('data', chunk => {
          data += chunk
        })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            // Appium returns a JSON with a 'build' or 'value' field
            if (json.build || json.value) {
              resolve(true)
            } else {
              resolve(false)
            }
          } catch {
            resolve(false)
          }
        })
      }
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
    req.end()
  })
}
