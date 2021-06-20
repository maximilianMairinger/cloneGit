import * as path from "path"
import { promises as fs } from "fs"
import doesFileExists from "./fileExists"
import { deepEqual as equals } from "fast-equals"
import clone from "fast-copy"


const notYetInited = Symbol("Not yet Inited")

function initThenCall<T, Params extends Array<T>, Return>(init: (() => void | Promise<void>) | Promise<void> | undefined, call: (...params: Params) => Return, attachTo?: GenericObject) {
  let initProm = typeof init === "function" ? init() : init

  type Ret = typeof initProm extends Promise<any> ? Return extends Promise<any> ? Return : Promise<Return> : typeof call

  let instantFunc: Ret
  let initPromIsInstanceOfPromise = initProm instanceof Promise

  let wrappedPromise = call[notYetInited]
  let hasWrappedPromise = wrappedPromise !== undefined

  let bothProms: Promise<any>;
  if (hasWrappedPromise) {
    if (initPromIsInstanceOfPromise) bothProms = Promise.all([initProm, wrappedPromise])
    else bothProms = wrappedPromise
  }
  //@ts-ignore
  else if (initPromIsInstanceOfPromise) bothProms = initProm

  if (initPromIsInstanceOfPromise) {
    //@ts-ignore
    instantFunc = async function (...params: Params): Ret {
      await bothProms
      return await call.call(this, ...params)
    }
  }
  else {
    instantFunc = call
  }

  Object.defineProperty(instantFunc, 'name', {value: call.name, writable: false});
  instantFunc[notYetInited] = bothProms


  if (attachTo !== undefined) {
    let name = call.name

    if (name === "" || name === undefined) throw new Error("Cannot attach anonymous function")

    let hasAttachedToPrototype = attachTo[name] !== undefined && !attachTo.hasOwnProperty(name)

    attachTo[name] = instantFunc

    if (initPromIsInstanceOfPromise) bothProms.then(() => {
      if (attachTo[name] === instantFunc) {
        if (hasAttachedToPrototype) delete attachTo[name]
        else attachTo[name] = call
      }
    })

    

    
    
  }

  else return instantFunc
}








class InternalSerialize<Store extends GenericObject = GenericObject> {
  private fileName: string;
  constructor(private name: string = "Unnamed", private Default: Store = {} as Store) {
    if (takenNamesIndex[name] === undefined) {
      takenNamesIndex[name] = 1
      this.fileName = name
    }
    else {
      takenNamesIndex[name]++
      let potentialName = name + " (" + takenNamesIndex[name] + ")"
      
      while (takenNamesIndex[potentialName] !== undefined) {
        takenNamesIndex[name]++
        potentialName = name + " (" + takenNamesIndex[name] + ")"
      }

      takenNamesIndex[potentialName] = 1
      this.fileName = potentialName
    }
    
    //@ts-ignore
    let fileCreation = this.mkfile()
    
   
    initThenCall(fileCreation, (this as any).read, this)
    initThenCall(fileCreation, (this as any).write, this)
  }

}

export const Serialize = InternalSerialize as any as {new<Store extends GenericObject = GenericObject>(storeName: string, Default?: Store): Serialize<Store>}
export default InternalSerialize as any as {new<Store extends GenericObject = GenericObject>(storeName: string, Default?: Store): Serialize<Store>}

let takenNamesIndex: {[name: string]: number} = {}

const dir = path.join(__dirname, "../../", "data_store")


let init = doesFileExists(dir).then(async (does) => {
  if (does) {
    let files = await fs.readdir(dir)
    files.forEach((file) => {
      takenNamesIndex[file] = 1
    })
  }
  else {
    await fs.mkdir(dir)
  }
})

type GenericObject = {[key in string]: any}


interface Serialize<Store extends GenericObject = GenericObject> {
  write(data: any): Promise<void>
  read(rememberInquiredDefaults?: boolean): Promise<GenericObject>
}


const extension = ".json"
let serProto = InternalSerialize.prototype

function rmDefaults(def: {[key in string | number]: any}, ob: unknown) {
  for (let key in def) {
    let defProp = def[key]
    let obProp = ob[key]
    if (typeof defProp === "object") {
      rmDefaults(obProp, defProp)
      if (equals(obProp, defProp)) delete ob[key]
    }
    else if (defProp === obProp) delete ob[key]
  }
  return ob
}

initThenCall(undefined, function removeDefaults(ob, def: {[key in string | number]: any} = this.Default) {
  return rmDefaults(def, clone(ob))
}, serProto)



initThenCall(init, async function write(ob: any) {
  await fs.writeFile(path.join(dir, this.fileName + extension), JSON.stringify(this.removeDefaults(ob), undefined, "  "))
}, serProto)

async function mergeConfig(def: any, ob: any) {
  let proms = []
  for (let key in def) {
    let defProp = def[key]
    let obProp = ob[key]
    if (obProp === undefined) {
      proms.add((async () => {
        let res = defProp
        if (res instanceof Function) res = await defProp()
        ob[key] = res
      })())
    }
    else if (typeof defProp === "object") {
      proms.add(mergeConfig(obProp, defProp))
    }
  }

  await Promise.all(proms)
  return ob
}


initThenCall(init, async function read(rememberInquiredDefaults: boolean = true) {
  let fileContent = (await fs.readFile(path.join(dir, this.fileName + extension))).toString()
  let preMerge: any
  try {
    preMerge = JSON.parse(fileContent)
  }
  catch(e) {
    preMerge = {}
    console.warn("Warning: Config file malformed. At: \"" + path.join(dir, this.fileName + extension) + "\"")
  }
  let merged = await mergeConfig(this.Default, clone(preMerge))
  if (rememberInquiredDefaults) {
    if (!equals(merged, preMerge)) this.write(merged)
  }
  return merged
}, serProto)

initThenCall(init, function mkfile() {
  return new Promise<void>((res) => {
    let filePath = path.join(dir, this.fileName + extension)
    
    doesFileExists(filePath).then((does) => {
      if (!does) fs.writeFile(path.join(dir, this.fileName + extension), "{\n  \n}")
      res()
    })
    
  })
  
}, serProto)



