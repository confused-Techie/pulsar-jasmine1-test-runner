
function createRunner({ logFile, headless, testPaths, buildAtomEnvironment, buildDefaultApplicationDelegate }) {
  // Load Jasmine 1.3.1
  require("../vendor/pulsar/jasmine-singleton.js");
  require("jasmine-focused"); // TODO this requires `vendor/jasmine-focused`
  // Work on `jasmine-focused` to simplify to where we can require the file we care about

  const normalizeComments = require("./helpers/normalize-comments.js");
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

};

module.exports = createRunner;
