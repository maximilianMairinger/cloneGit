// import "./../../app/src/cloneGit"
import josmFsAdapter from "josm-fs-adapter";
import inq from "../../app/src/lib/inq";
import clone from "circ-clone"
import ajaon from "ajaon"






(async () => {
  const a = (await fetch("https://api.github.com/users/maximilianMairinger/repos")).json().then((a) => a.map(({name}) => name))
  
  
  Promise.race([a, new Promise((resolve, reject) => {
    setTimeout(() => {
      reject("timeout")
    }, 10)
  })]).then((a) => {
    console.log("res", a)
  }).catch((e) => {
    console.log("rej", e)
  })

})()


