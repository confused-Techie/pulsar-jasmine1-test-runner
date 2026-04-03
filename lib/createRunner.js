/**
  Based heavily off of the original Pulsar Jasmine1-Test-Runner:
  https://github.com/pulsar-edit/pulsar/blob/v1.131.3/spec/runners/jasmine1-test-runner.js

  Further modified with inspirations taken from:
  - https://github.com/pulsar-edit/jasmine5-test-runner/tree/main
  - https://github.com/UziTech/atom-jasmine3-test-runner/tree/master
*/

const path = require("node:path");
const fs = require("fs-plus");
const temp = require("temp");
const { asyncifyJasmineFn, disableFocusMethods, requireSpecs, setSpecType, buildReporter } = require("./helpers.js");

function createRunner({ logFile, headless, testPaths, buildAtomEnvironment, buildDefaultApplicationDelegate }) {
  // Load Jasmine 1.3.1
  require("../vendor/pulsar/jasmine-singleton.js");
  require("jasmine-focused"); // TODO this requires `vendor/jasmine-focused`
  // Work on `jasmine-focused` to simplify to where we can require the file we care about

  const normalizeComments = require("./normalizeComments.js");
  for (let key in normalizeComments) { window[key] = normalizeComments[key]; }

  // Rewrite global jasmine functions to have support for async tests.
  // This way packages can create async specs without having to import these from the
  // async-spec-helpers files.
  global.it = asyncifyJasmineFn(global.it, 1);
  global.fit = asyncifyJasmineFn(global.fit, 1);
  global.ffit = asyncifyJasmineFn(global.ffit, 1);
  global.fffit = asyncifyJasmineFn(global.fffit, 1);
  global.beforeEach = asyncifyJasmineFn(global.beforeEach, 0);
  global.afterEach = asyncifyJasmineFn(global.afterEach, 0);

  // Allow document.title to be assigned in specs without scewing up spec window title
  let documentTitle = null;
  Object.defineProperty(document, 'title', {
    get() { return documentTitle; },
    set(title) { return documentTitle = title; }
  });

  const userHome = process.env.ATOM_HOME || path.join(fs.getHomeDirectory(), '.atom');
  const atomHome = temp.mkdirSync({ prefix: 'atom-test-home-' });

  if (process.env.APM_TEST_PACKAGES) {
    const testPackages = process.env.APM_TEST_PACKAGES.split(/\s+/);
    fs.makeTreeSync(path.join(atomHome, 'packages'));
    for (let packName of Array.from(testPackages)) {
      const userPack = path.join(userHome, 'packages', packName);
      const loadablePack = path.join(atomHome, 'packages', packName);

      try {
        fs.symlinkSync(userPack, loadablePack, 'dir');
      } catch(error) {
        fs.copySync(userPack, loadablePack);
      }
    }
  }

  const applicationDelegate = buildDefaultApplicationDelegate();
  applicationDelegate.setRepresentedFilename = function () {};
  applicationDelegate.setWindowDocumentEdited = function () {};

  window.atom = buildAtomEnvironment({
    applicationDelegate,
    window,
    document,
    enablePersistence: false,
    configDirPath: atomHome
  });

  // require('../helpers/jasmine1-spec-helper');
  // TODO: This spec helper relies on loads of internal classes. How should we handle this?
  if (process.env.JANKY_SHA1 || process.env.CI) { disableFocusMethods(); }
  for (let testPath of Array.from(testPaths)) { requireSpecs(testPath); }

  setSpecType("user");

  let resolveWithExitCode = null;
  const promise = new Promise((resolve, reject) => resolveWithExitCode = resolve);
  const jasmineEnv = jasmine.getEnv();
  jasmineEnv.addReporter(buildReporter({logFile, headless, resolveWithExitCode}));

  if (process.env.SPEC_FILTER) {
    const { getFullDescription } = require("../helpers/jasmine-list-reporter");
    const regex = new RegExp(process.env.SPEC_FILTER);
    jasmineEnv.specFilter = (spec) => getFullDescription(spec, false).match(regex);
  }

  if (jasmineEnv.setIncludedTags) {
    jasmineEnv.setIncludedTags([process.platform]);
  }

  const jasmineContent = document.createElement("div");
  jasmineContent.setAttribute("id", "jasmine-content");

  document.body.appendChild(jasmineContent);

  jasmineEnv.execute();
  return promise;
};

module.exports = createRunner;
