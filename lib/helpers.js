/**
  Based entirely off the original Pulsar Jasmine1-Test-Runner:
  https://github.com/pulsar-edit/pulsar/blob/v1.131.3/spec/runners/jasmine1-test-runner.js

  Pulled functions here for clarity and ease of reading.
*/
const path = require("node:path");
const fs = require("fs-plus");
const Grim = require("grim");
const { ipcRenderer } = require("electron");

const asyncifyJasmineFn = (fn, callbackPosition) => (function (...args) {
  if (typeof args[callbackPosition] === "function") {
    const callback = args[callbackPosition];

    args[callbackPosition] = function (...args) {
      const result = callback.apply(this, args);
      if (result instanceof Promise) {
        return waitsForPromise(() => result);
      }
    };
  }

  return fn.apply(this, args);
});

const waitsForPromise = function (fn) {
  const promise = fn();

  return global.waitsFor("spec promise to resolve", done => promise.then(done, function (error) {
    jasmine.getEnv().currentSpec.fail(error);
    return done();
  }));
};

const disableFocusMethods = () => ["fdescribe", "ffdescribe", "fffdescribe", "fit", "ffit", "fffit"].forEach(function (methodName) {
  const focusMethod = window[methodName];
  return window[methodName] = function (description) {
    const error = new Error("Focused spec is running on CI");
    return focusMethod(description, function () { throw error; });
  }
});

const requireSpecs = function(testPath, specType) {
  if (fs.isDirectorySync(testPath)) {
    return (() => {
      const result = [];
      for (let testFilePath of Array.from(fs.listTreeSync(testPath))) {
        if (/-spec\.(coffee|js)$/.test(testFilePath)) {
          require(testFilePath);
          // Set spec directory on spec for setting up the project in spec-helper
          result.push(setSpecDirectory(testPath));
        }
      }
      return result;
    })();
  } else {
    require(testPath);
    return setSpecDirectory(path.dirname(testPath));
  }
};

const setSpecField = function (name, value) {
  const specs = jasmine.getEnv().currentRunner().specs();
  if (specs.length === 0) { return; }
  return (() => {
    const result = [];
    for (let start = specs.length-1, index = start, asc = start <= 0; asc ? index <= 0 : index >= 0; asc ? index++ : index--) {
      if (specs[index][name] != null) { break; }
      result.push(specs[index][name] = value);
    }
    return result;
  })();
};

const setSpecType = specType => setSpecField("specType", specType);

const setSpecDirectory = specDirectory => setSpecField("specDirectory", specDirectory);

const buildReporter = function ({logFile, headless, resolveWithExitCode}) {
  if (headless) {
    return buildTerminalReporter(logFile, resolveWithExitCode);
  } else {
    let reporter;
    const AtomReporter = require("../helpers/jasmine1-atom-reporter.js");
    return reporter = new AtomReporter();
  }
};

const buildTerminalReporter = function (logFile, resolveWithExitCode) {
  let logStream;
  if (logFile != null) { logStream = fs.openSync(logFile, "w"); }
  const log = function (str) {
    if (logStream != null) {
      return fs.writeSync(logStream, str);
    } else {
      return ipcRenderer.send("write-to-stderr", str);
    }
  };

  const options = {
    print(str) {
      return log(str);
    },
    onComplete(runner) {
      if (logStream != null) { fs.closeSync(logStream); }
      if (Grim.getDeprecationsLength() > 0) {
        Grim.logDeprecations();
        resolveWithExitCode(1);
        return;
      }

      if (runner.results().failedCount > 0) {
        return resolveWithExitCode(1);
      } else {
        return resolveWithExitCode(0);
      }
    }
  };

  if (process.env.ATOM_JASMINE_REPORTER === "list") {
    const { JasmineListReporter } = require("../helpers/jasmine-list-reporter");
    return new JasmineListReporter(options);
  } else {
    const { TerminalReporter } = require("jasmine-tagged");
    // TODO: What's actually happening here?!
    // `jasmine-tagged` doesn't export a TerminalReporter. But does export `jasmine-focused`.
    // `jasmine-focused` exports the TerminalReporter from `jasmine-node`.
    // But not the original `mhevery/jasmine-node` we already use to get TerminalReporter
    // in the `pulsar` `jasmine-singleton` helper.
    // Instead it's `jasmine-node` from `kevinsawicki/jasmine-node`. Which has
    // just a few changes from the original `jasmine-node`.
    // Due to the risk of breaking things in minute ways with skipping any of these
    // steps, I'll recreate this madness in this repo. But it'd be a really good idea
    // to not do all of this.
    return new TerminalReporter(options);
  }
};

module.exports = {
  asyncifyJasmineFn,
  disableFocusMethods,
  requireSpecs,
  setSpecType,
  buildReporter,
};
