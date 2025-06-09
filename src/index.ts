#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import packageJSON from '../package.json'
import { withCheckSupportedPlatformsTool } from './tools/checkSupportedPlatforms.tool'
import { withSimulatorListTool } from './tools/getSimulatorList.tool'
import { withIosSimulatorScreenshotTool } from './tools/getSimulatorScreenshot.tool'

// Create an MCP server
const server = new McpServer({
  name: packageJSON.name,
  version: packageJSON.version,
})

// Register tools
withIosSimulatorScreenshotTool(server)
withSimulatorListTool(server)
withCheckSupportedPlatformsTool(server)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
await server.connect(transport)
