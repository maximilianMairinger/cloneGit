#!/usr/bin/env node

import xrray from "xrray"; xrray()
import make$, { setDry, setVerbose as setShellVerbose } from "./lib/shell"
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
import sani, { CONST, OR } from "sanitize-against"
import Fuse from "fuse.js"
import { memoize } from "key-index"



const $ = make$()


const cloneTemplate = {
  ssh: ({username, repo}) => `git@github.com:${username}/${repo}.git`,
  http: ({username, repo}) => `https://github.com/${username}/${repo}.git`
}


const queryTemplate = ({username}) => `
{
  user(login: "${username}") {
    repositories(first: 100) {
      nodes {
        name
      }
    }
  }
}
`;


const saniOptions = sani({
  "via?": new OR(new CONST("http"), new CONST("ssh")),
  "username?": String,
  "dryRun?": false as boolean,
  "verbose?": false as boolean,
  "auth?": String
})

const saniConfigRelevantOptions = sani({
  "via?": new OR(new CONST("http"), new CONST("ssh")),
  "username?": String,
  "auth?": String
})

program
  .version(packetJson.version)
  .description(packetJson.description)
  .name(packetJson.name)
  .option('--verbose', 'verbose stdout logs')
  .option("--via", `clone via "http" or "ssh"`)
  .option("--username", "github username")
  .option("--auth", "github accessToken")
  .option("--dry-run", "don't actually clone, but adjust config (= username and via option). Also set verbose to true by default")
  .argument('[repo]', "repo to clone, defaults to the current directory name")
  .argument('[destination]', "Destination where to clone the repo, defaults to the repo name")
  .action(async (repo, dest, options: {via?: "http" | "ssh", username?: string, dryRun?: boolean, verbose?: boolean}) => { (async () => {
    options = saniOptions(options)
    if (options.dryRun && options.verbose === undefined) options.verbose = true
    setVerbose(options.verbose)
    setDry(options.dryRun)
    setShellVerbose(options.verbose)


    const configOptions = saniConfigRelevantOptions(options) as { via?: "http" | "ssh", username?: string, auth?: string }

    const configDB = (await josmFsAdapter("config.json", merge({
      username: () => inq("Github username"),
      via: () => inq({
        message: "Clone via",
        type: "list",
        choices: ["http", "ssh"]
      }),
      auth: async () => {
        const u = await inq("Github auth token (optional)")
        if (u === "") return undefined
        return u
      }
    }, configOptions)));

    configDB(configOptions)

    const config = configDB()


    const userReposProm = (() => {
      if (config.auth !== undefined) {
        return fetch("https://api.github.com/graphql", {
          method: 'POST',
          body: JSON.stringify({
            query: queryTemplate({username: config.username})
          }),
          headers: {
            Authorization: `Bearer ${config.auth}`,
            'User-Agent': 'Clone git',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }).then((resp) => resp.json()).then((a) => a.data.user.repositories.nodes.map(({name}) => name)) as Promise<string[]>
      }
      else {
        return fetch(`https://api.github.com/users/${config.username}/repos`).then((a) => a.json()).then((a) => a.map(({name}) => name)) as Promise<string[]>
      }
    })().then((repos) => {
      return {
        repos,
        fuse: memoize(() => new Fuse(repos))
      }
    }).catch((e) => {throw {which: "userRepos" as const, data: e}}).then((data: {repos: string[], fuse: () => Fuse<string>}) => {return {which: "userRepos" as const, data}})
    
    

    if (!repo) {
      repo = path.basename(path.resolve(""))
      if (dest === undefined) dest = "."
    }

    const ogDest = dest

    async function checkDest(repo: string, dest?: string) {
      let repoBaseName = repo
      if (!repo.includes(".")) repo = cloneTemplate[config.via]({ repo, username: config.username })
      else repoBaseName = repo.split(".")[0].split("/").last
  
      let actualDest = dest !== undefined ? dest : repoBaseName
  
      if (await fileExists(actualDest)) {
        if ((await fs.stat(actualDest)).isDirectory()) {
          if (await fileExists(path.join(actualDest, ".git"))) warn(`There is already a git repo in ${actualDest}. Terminating here`)
          else error(`Directory ${actualDest} already exists and is not a git repo`)
        }
        else error(`File ${actualDest} already exists`)        
        throw new Error("Destination already exists")
      }

      return {repoBaseName, actualDest, repo}
    }

    let { actualDest, repoBaseName, repo: _repo } = await checkDest(repo, ogDest)
    repo = _repo
    

    log(`Cloning ${repo}...`)
    
    
    const cloning = $(`git clone ${repo} ${actualDest}`).then((data) => {return {which: "cloning" as const, data}}).catch((e) => {throw {which: "cloning" as const, data: e}})



    async function handleRepos(data: {repos: string[], fuse: () => Fuse<string>}) {
      if (data.repos.includes(repoBaseName)) return "should work"
      else {
        const recommendations = data.fuse().search(repoBaseName).map((a) => a.item)
        if (recommendations.length === 0) {
          error(`Repo ${repo} not found for user ${config.username}. Terminating here`)
          throw new Error("Repo not found")
        }
        else {
          recommendations.length = 3
          const newRepo = await inq({
            message: "Did you mean",
            type: "list",
            choices: recommendations
          })

          const d = await checkDest(newRepo, ogDest)
          actualDest = d.actualDest
          repoBaseName = d.repoBaseName
          repo = d.repo

          log(`Cloning ${repo}...`)
          try {
            await $(`git clone ${repo} ${actualDest}`)
          }
          catch(e) {
            error(`Could not clone ${repo}, even though the repo exists. Terminating here`)
            throw new Error("Could not clone")
          }
          
          return "done"
        }
      }
    }

    const doneWithClone = Promise.race([cloning, userReposProm]).then(async ({which, data}) => {
      if (which === "cloning") return
      if (which === "userRepos") {
        await handleRepos(data)
      }
    }).catch(async ({which, data}) => {
      if (which === "cloning") {
        const resp = await handleRepos((await userReposProm).data)
        if (resp === "should work") {
          error(`Could not clone ${repo}, even though the repo exists. Terminating here`)
          throw new Error("Could not clone")
        }
      }
      else if (which === "userRepos") {
        try {
          await cloning
        }
        catch(e) {
          error(`Could not clone ${repo}, and we couldn't confirm if the repo exists. Terminating here`)
          throw new Error("Could not clone")
        }
      }
    })

    await doneWithClone

    const exists = !options.dryRun ? await fileExists(path.join(actualDest, "package.json")) : (() => {
      info("Dry run, skipping package.json check")
      return false
    })()
    if (exists) {
      log("Installing dependencies...")

      $.cd(actualDest)
      await $(`npm i`)
    }
    
    
  })().then(() => {
    log("Done")
  })
  .catch((e) => {
    if (e instanceof Error) {
      error("Fatal:", e.message)
      process.exit(1)
    }
    else {
      error("Fatal:", e)
      process.exit(1)
    }
  })})

.parse(process.argv)












