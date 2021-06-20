import chalk from "chalk"
import xrray from "xrray"; xrray()

let verbose = false
let testEnv = false
let last = ""

export function setVerbose(to: boolean) {
  verbose = to
}

export function setTestEnv(to: boolean) {
  testEnv = to
}


export function info(...msg: any[]) {
  go(0, "Info", "info", "cyanBright", msg)
}

export function log(...msg: any[]) {
  go(1, "Log", "log", "blue", msg)
}

export function warn(...msg: any[]) {
  go(0, "Warn", "warn", "yellow", msg)
}

export function error(...msg: any[]) {
  go(1, "Error", "error", "red", msg)
}

function range(l: number) {
  let a: number[] = []
  for (let i = 0; i < l; i++) {
    a.add(i)
  }
  return a
}

const indentCount = 7
function indent(str: string) {
  for (const i of range(indentCount - str.length)) {
    str += " "
  }
  return str
}

function go(severity: 0 | 1, prefix: string, kind: string, color: string, msg: any[]) {
  let n = []
  let err = []
  msg.ea((m) => {
    if (m instanceof Error) {
      err.add(m.stack)
      n.add(m.message)
    }
    else n.add(m)
  })

  let strings = []
  let notStrings = []
  msg.ea((s) => {
    if (typeof s === "string") strings.add(s.split("\n").join("\n" + indent("") + " "))
    else notStrings.add(s)
  })


  if (severity === 1 || verbose) console[kind](chalk[color]((last !== kind ? indent(prefix) : (indent("") + " ")), ...strings), ...notStrings)
  if (testEnv && !err.empty) console.log(...err)
  

  let lmsg = msg.last
  if (typeof lmsg === "string" && lmsg.substr(lmsg.length-1) === "\n") last = ""
  else last = kind
}