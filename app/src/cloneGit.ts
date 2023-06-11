#!/usr/bin/env node

import xrray from "xrray"; xrray()
import $ from "./lib/shell"
import * as path from "path"
import inq from "./lib/inq"
import {promises as fs} from "fs"
import fileExists from "./lib/fileExists";
import josmFsAdapter from "josm-fs-adapter";
import { program } from "commander"
import reqPackageJson, { reqPackagePath } from "req-package-json"
const packetJson = reqPackageJson()
import { setVerbose, log, warn, error, info } from "colorful-cli-logger"
import { mergeKeysDeep as merge } from "circ-clone"




const cloneTemplate = {
  ssh: ({username, repo}) => `git@github.com:${username}/${repo}.git`,
  http: ({username, repo}) => `https://github.com/${username}/${repo}.git`
}



program
  .version(packetJson.version)
  .description(packetJson.description)
  .name(packetJson.name)
  .option('-s, --silent', 'silence stdout')
  .option("--via", `clone via "http" or "ssh"`)
  .option("--username", "github username")
  .option("--dry-run", "don't actually clone, but adjust config (= username and via option)")
  .argument('[repo]', "repo to clone, defaults to the current directory name")
  .argument('[destination]', "Destination where to clone the repo, defaults to the repo name")
  .action(async (repo, dest, options: {via?: string, username?: string, dryRun?: boolean, silent?: boolean}) => {
    setVerbose(!options.silent)


    const config = (await josmFsAdapter("config.json", merge(options as {}, {
      username: () => inq("Github username"),
      via: () => inq({
        message: "Clone via",
        type: "list",
        choices: ["http", "ssh"]
      })
    })))();


    
    if (!repo) {
      repo = path.basename(path.resolve(""))
      if (dest === undefined) dest = "."
    }
    let repoBaseName = repo
    if (!repo.includes(".")) repo = cloneTemplate[config.via]({ repo, username: config.username })
    else repoBaseName = repo.split(".")[0].split("/").last

    const actualDest = dest !== "" ? dest : repoBaseName

    if (await fileExists(actualDest)) {
      if ((await fs.stat(actualDest)).isDirectory()) {
        if (await fileExists(path.join(actualDest, ".git"))) warn(`There is already a git repo in ${actualDest}. Terminating here`)
        else error(`Directory ${actualDest} already exists and is not a git repo`)
      }
      else error(`File ${actualDest} already exists`)        
      return
    }

    info(`Cloning ${repo}...`)
    if (options.dryRun) log("Skipping clone and npm install because this is a dry run")
    else {
      $(`cd ${path.resolve("")} && git clone ${repo} ${dest}`)
      const exists = await fileExists(path.join(actualDest, "package.json"))
      if (exists) {
        info("Installing dependencies...")
        $(`cd ${actualDest} && npm i`)
      }
    }
    
    
    

    info("Done")
  
    
    
  })

.parse(process.argv)












