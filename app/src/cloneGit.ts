import $ from "./lib/shell"
import { log } from "./lib/logger"
import path from "path"
import interpolateTemplate from "josm-interpolate-string"
const args = require("yargs").argv
import InternalSerialize from "./lib/serialize"

const cloneTemplate = {
  ssh: "git@github.com:maximilianMairinger/$[ name ].git",
  http: "https://github.com/maximilianMairinger/$[ name ].git"
}


let serialize = new InternalSerialize("config")
serialize.read


let repo = args._.first as string
let dest = args._[1]
if (!repo) {
  repo = path.basename(path.resolve(""))
}

if (!repo.includes(".")) {
  repo = "https://github.com"
}

