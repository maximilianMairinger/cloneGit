import shell from "shelljs"
import path from "path"
import { warn, error, info } from "colorful-cli-logger"

export function check(program: string) {
  if (!shell.which(program)) throw "Unable to use " + program + ". All commands reliant on this program will not be executed."
}

let dry = false
export function setDry(_dry: boolean) {
  dry = _dry
  if (dry && verbose === undefined) verbose = true
}

let verbose = undefined
export function setVerbose(_verbose: boolean) {
  verbose = _verbose
}


export default function() {
  let cd: string = path.resolve(".")
  function $(cmd: string, logOnThrow = verbose) {
    return new Promise<string>((resolve, reject) => {
      info(`shell${dry ? " (dry)" : ""}: ${cmd}`)
  
 
      if (dry) return setTimeout(() => {resolve("")}, 10)
      const actualCmd = `cd ${cd} && ${cmd}`
      shell.exec(actualCmd, {silent: true, fatal: false}, (code: number, stderr: string, stdout: string) => {
        if (code !== 0) {
          if (logOnThrow) {
            error("command:", actualCmd)
            error("Encountered while executing the command above, code:", code)
            error("stdout:")
            error(stdout)
            error("stderr:")
            error(stderr)
          }
          reject(stderr)
        }
        else {
          resolve(stdout)
        }
      })
    })
  }
  $.cd = (dir: string) => {
    if (path.isAbsolute(dir)) cd = dir
    else cd = path.join(cd, dir)
  }
  return $
}