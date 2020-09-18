const shell = require("shelljs")
import { warn, error, info } from "./logger"

export function check(program: string) {
  if (!shell.which(program)) throw "Unable to use " + program + ". All commands reliant on this programm will not be executed."
}

export default function(cmd: string) {
  info(`shell: ${cmd}`)

  let res = shell.exec(cmd, {silent: true, fatal: true})

  if (res.code !== 0) {
    error("Encountered while executing the command above")
    info("Stacktrace:")
    info(res.stderr)
  }
}