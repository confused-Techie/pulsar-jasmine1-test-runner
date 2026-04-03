
function createRunner({ logFile, headless, testPaths, buildAtomEnvironment, buildDefaultApplicationDelegate }) {
  // Load Jasmine 1.3.1
  require("../vendor/pulsar/jasmine-singleton.js");
  require("jasmine-focused"); // TODO this requires `vendor/jasmine-focused`
  // Work on `jasmine-focused` to simplify to where we can require the file we care about
};

module.exports = createRunner;
