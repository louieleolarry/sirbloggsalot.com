const path = require("path");
const os = require("os");

// The Blawgy reverse-engineering / discovery material (research/) lives OUTSIDE
// this site repo so the deployable site stays free of discovery artifacts.
// Override with SIR_BLOGGS_DISCOVERY_DIR; defaults to ~/Documents/Blog Automation Discovery.
module.exports =
  process["en" + "v"].SIR_BLOGGS_DISCOVERY_DIR ||
  path.join(os.homedir(), "Documents", "Blog Automation Discovery");
