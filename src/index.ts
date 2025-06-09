#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import packageJSON from '../package.json'
import { withIosSimulatorScreenshotTool } from './tools/getIosSimulatorScreenshot.tool.js'
import { withSimulatorListTool } from './tools/getSimulatorList.js'

// Create an MCP server
const server = new McpServer({
  name: packageJSON.name,
  version: packageJSON.version,
})

// Register tools
withIosSimulatorScreenshotTool(server)
withSimulatorListTool(server)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
await server.connect(transport)
