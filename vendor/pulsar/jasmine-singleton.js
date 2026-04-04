let jasmine;

jasmineVendor = require("./jasmine.js");
for (let key in jasmineVendor) { window[key] = jasmineVendor[key]; }

jasmine = jasmineVendor.jasmine;

require("../jasmine-json");

if ( !jasmine.TerminalReporter ) {
  const { jasmineNode } = require("../jasmine-node/lib/reporter.js");

  jasmine.TerminalReporter = jasmineNode.TerminalReporter;
}

module.exports = jasmine;
