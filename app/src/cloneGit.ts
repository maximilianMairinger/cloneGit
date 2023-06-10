#!/usr/bin/env node

import xrray from "xrray"; xrray()
import $ from "./lib/shell"
import { log, setVerbose, setTestEnv, error } from "./lib/logger"
import * as path from "path"
const argv = require("yargs").argv
import Serialize from "./lib/serialize"
import clone from "fast-copy"
import merge from "deepmerge"
import inq from "./lib/inq"
import {promises as fs} from "fs"
import fileExists from "./lib/fileExists";

const cloneTemplate = {
  ssh: ({username, repo}) => `git@github.com:${username}/${repo}.git`,
  http: ({username, repo}) => `https://github.com/${username}/${repo}.git`
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
    let repoBaseName = repo
    if (!repo.includes(".")) repo = cloneTemplate[config.via]({ repo, username: config.username })
    else repoBaseName = repo.split(".")[0].split("/").last

    const actualDest = dest !== "" ? dest : repoBaseName

    if (await fileExists(actualDest)) {
      if ((await fs.stat(actualDest)).isDirectory()) {
        if (await fileExists(path.join(actualDest, ".git"))) log(`There is already a git repo in ${actualDest}`)
        else error(`Directory ${actualDest} already exists and is not a git repo`)
      }
      else error(`File ${actualDest} already exists`)        
      return
    }

    log(`Cloning ${repo}...`)
    $(`cd ${path.resolve("")} && git clone ${repo} ${dest}`)
    const exists = await fileExists(path.join(actualDest, "package.json"))
    if (exists) {
      log("Installing dependencies...")
      $(`cd ${actualDest} && npm i`)
    }
    

    log("Done")
  }  
})()



