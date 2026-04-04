/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let FailureTree;
const path = require('path');

const _ = require('underscore');
const coffeestack = require('coffeestack');

const sourceMaps = {};

module.exports =
(FailureTree = (function() {
  FailureTree = class FailureTree {
    static initClass() {
      this.prototype.suites = null;
    }

    constructor() {
      this.suites = [];
    }

    isEmpty() { return this.suites.length === 0; }

    add(spec) {
      return (() => {
        const result = [];
        for (let item of Array.from(spec.results().items_)) {
          if (item.passed_ === false) {
            const failurePath = [];
            let parent = spec.suite;
            while (parent) {
              failurePath.unshift(parent);
              parent = parent.parentSuite;
            }

            let parentSuite = this;
            for (let failure of Array.from(failurePath)) {
              if (parentSuite.suites[failure.id] == null) { parentSuite.suites[failure.id] = {spec: failure, suites: [], specs: []}; }
              parentSuite = parentSuite.suites[failure.id];
            }

            if (parentSuite.specs[spec.id] == null) { parentSuite.specs[spec.id] = {spec, failures:[]}; }
            parentSuite.specs[spec.id].failures.push(item);
            result.push(this.filterStackTrace(item));
          }
        }
        return result;
      })();
    }

    filterJasmineLines(stackTraceLines) {
      const jasminePattern = /^\s*at\s+.*\(?.*[\\/]jasmine(-[^\\/]*)?\.js:\d+:\d+\)?\s*$/;

      let index = 0;
      return (() => {
        const result = [];
        while (index < stackTraceLines.length) {
          if (jasminePattern.test(stackTraceLines[index])) {
            result.push(stackTraceLines.splice(index, 1));
          } else {
            result.push(index++);
          }
        }
        return result;
      })();
    }

    filterTrailingTimersLine(stackTraceLines) {
      if (/^(\s*at .* )\(timers\.js:\d+:\d+\)/.test(_.last(stackTraceLines))) {
        return stackTraceLines.pop();
      }
    }

    filterSetupLines(stackTraceLines) {
      // Ignore all lines starting at the first call to Object.jasmine.executeSpecsInFolder()
      let removeLine = false;
      let index = 0;
      return (() => {
        const result = [];
        while (index < stackTraceLines.length) {
          if (!removeLine) { removeLine = /^\s*at Object\.jasmine\.executeSpecsInFolder/.test(stackTraceLines[index]); }
          if (removeLine) {
            result.push(stackTraceLines.splice(index, 1));
          } else {
            result.push(index++);
          }
        }
        return result;
      })();
    }

    filterFailureMessageLine(failure, stackTraceLines) {
      // Remove initial line(s) when they match the failure message
      const errorLines = [];
      while (stackTraceLines.length > 0) {
        if (/^\s+at\s+.*\((.*):(\d+):(\d+)\)\s*$/.test(stackTraceLines[0])) {
          break;
        } else {
          errorLines.push(stackTraceLines.shift());
        }
      }

      const stackTraceErrorMessage = errorLines.join('\n');
      const {message} = failure;
      if ((stackTraceErrorMessage !== message) && (stackTraceErrorMessage !== `Error: ${message}`)) {
        return stackTraceLines.splice(0, 0, ...Array.from(errorLines));
      }
    }

    filterOriginLine(failure, stackTraceLines) {
      let match;
      if (stackTraceLines.length !== 1) { return stackTraceLines; }

      // Remove remaining line if it is from an anonymous function
      if (match = /^\s*at\s+((\[object Object\])|(null))\.<anonymous>\s+\((.*):(\d+):(\d+)\)\s*$/.exec(stackTraceLines[0])) {
        stackTraceLines.shift();
        const filePath = path.relative(process.cwd(), match[4]);
        const line = match[5];
        const column = match[6];
        return failure.messageLine = `${filePath}:${line}:${column}`;
      }
    }

    filterStackTrace(failure) {
      let stackTrace = failure.trace.stack;
      if (!stackTrace) { return; }

      let stackTraceLines = stackTrace.split('\n').filter(line => line);
      this.filterJasmineLines(stackTraceLines);
      this.filterTrailingTimersLine(stackTraceLines);
      this.filterSetupLines(stackTraceLines);
      stackTrace = coffeestack.convertStackTrace(stackTraceLines.join('\n'), sourceMaps);
      if (!stackTrace) { return; }

      stackTraceLines = stackTrace.split('\n').filter(line => line);
      this.filterFailureMessageLine(failure, stackTraceLines);
      this.filterOriginLine(failure, stackTraceLines);
      return failure.filteredStackTrace = stackTraceLines.join('\n');
    }

    forEachSpec(param, callback, depth) {
      if (param == null) { param = {}; }
      const {spec, suites, specs, failures} = param;
      if (depth == null) { depth = 0; }
      if (failures != null) {
        callback(spec, null, depth);
        return Array.from(failures).map((failure) => callback(spec, failure, depth));
      } else {
        let child;
        callback(spec, null, depth);
        depth++;
        for (child of Array.from(_.compact(suites))) { this.forEachSpec(child, callback, depth); }
        return (() => {
          const result = [];
          for (child of Array.from(_.compact(specs))) {             result.push(this.forEachSpec(child, callback, depth));
          }
          return result;
        })();
      }
    }

    forEach(callback) {
      return Array.from(_.compact(this.suites)).map((suite) => this.forEachSpec(suite, callback));
    }
  };
  FailureTree.initClass();
  return FailureTree;
})());
