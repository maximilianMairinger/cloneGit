// import "./../../app/src/cloneGit"
import josmFsAdapter from "josm-fs-adapter";
import inq from "../../app/src/lib/inq";
import clone from "circ-clone"



(async () => {
  let config = await josmFsAdapter("config", {
    username: () => inq("Github username"),
    via: () => inq({
      message: "Clone via",
      type: "list",
      choices: ["http", "ssh"]
    }),
  });
  
  console.log(clone(config()))
})()

