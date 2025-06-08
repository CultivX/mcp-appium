import childProcess from 'node:child_process'
import util from 'node:util'

const exec = util.promisify(childProcess.exec)

export const runShellCommand = async (command: string) => {
  const { stdout, stderr } = await exec(command, {
    cwd: process.cwd(),
  })

  return { stdout: stdout?.toString() ?? '', stderr: stderr?.toString() ?? '' }
}
