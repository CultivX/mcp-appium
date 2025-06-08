import { AppConfig } from './types/config'
import { greeting } from './utils/greeting'

const config: AppConfig = {
  name: 'appium-mcp',
  version: '1.0.0',
  debug: process.env.NODE_ENV === 'development',
};

function main() {
  console.log(greeting(config.name));
  console.log(`Version: ${config.version}`);
  console.log(`Debug mode: ${config.debug ? 'enabled' : 'disabled'}`);
}

export { config, main }

// Run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}