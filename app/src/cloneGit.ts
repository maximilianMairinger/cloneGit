import $ from "./lib/shell"
import { log, setVerbose, setTestEnv } from "./lib/logger"
import path from "path"
import interpolateTemplate from "josm-interpolate-string"
const argv = require("yargs").argv
import Serialize from "./lib/serialize"
import xrray from "xrray"; xrray()
import clone from "fast-copy"
import merge from "deepmerge"
import inq from "./lib/inq"

const cloneTemplate = {
  ssh: "git@github.com:$[ username ]/$[ repo ].git",
  http: "https://github.com/$[ username ]/$[ repo ].git"
}


let serialize = new Serialize("config", {
  via: "http",
  username: () => inq("Github username")
});

(async () => {
  let params = argv._ as string[]
  delete argv._
  delete argv.$0
  let args = argv as {[key in string]: string}

  let config = await serialize.read()
  


  let repo = params.first
  


  if (repo === "config") {
    await serialize.write(merge(config, clone(args)))
    log("Updated config")
  }
  else {
    let dest = params[1] ? params[1] : ""
    if (!repo) repo = path.basename(path.resolve(""))
    if (!repo.includes(".")) repo = interpolateTemplate(cloneTemplate[config.via], { repo, username: config.username }).get()

    log(`Cloning ${repo}...`)
    $(`cd ${path.resolve("")} & git clone ${repo} ${dest}`)
    log("Done")
  }  
})()



