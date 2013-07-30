//
// Copyright (c) Telefonica I+D. PDI  All rights reserved.
//
//

var winston = require('winston');
var stackParser = require('stack-parser');
var os = require('os');

var hostname = os.hostname();
var winstonLogger = null;

var config = {
  logLevel: 'debug',
  inspectDepth: 2,
  Console: {
    level: 'debug', timestamp: true, json: true
  },
  File: {
    level: 'debug', filename: 'UNDEFINED-COMPONENT_' + hostname + '.log', timestamp: true, json: true
  }
};

function createWinston(cfg) {
  "use strict";

  /**
   * This function will be called when an error arises writing a log in a file
   * @param err The error
   * @returns {boolean} true (It forces to exit the application -due requirements-)
   */
  function exitOnError(err) {

    var component = null;

    try {
      var items = stackParser.parse(err.stack);
      component = items[0].file + ':' + items[0].line + ':' + items[0].column;
    } catch(e) {
      //Nothing to do...
    }

    winstonLogger.emerg(err.toString(), { component: component });

    //Exit (due requirements)
    return cfg.exitOnError || true;
  }

  winstonLogger = new (winston.Logger)({
    level: cfg.logLevel,
    exitOnError: exitOnError,
    transports: [
      new (winston.transports.Console)(cfg.Console),
      new (winston.transports.File)(cfg.File)
    ]
  });

  winstonLogger.setLevels(winston.config.syslog.levels);

}

function setConfig(newCfg) {
  "use strict";

  config = newCfg;
  config.Console.json = true;
  config.File.handleExceptions = true;    //Necessary to handle file exceptions
  createWinston(config);

}

function newLogger() {
  "use strict";

  if (winstonLogger === null) {
    createWinston(config);
  }

  var logger = {};

  /**
   *
   * @param level Standard default values (DEBUG, INFO, NOTICE, WARNING, ERROR, CRIT, ALERT, EMERG)
   * @param logObj An object with the following fileds: component, traceID, userID, opType and msg. If any of
   * those fields are not included, default values will be used.
   * @param obj An object or an array that will be printed after the message
   * @returns {*}
   */
  logger.log = function (level, message, logObj) {

    if (winstonLogger.levels[level] < winstonLogger.levels[config.logLevel]) {
      return;
    }

    logObj = logObj || { };
    logObj.component = logObj ? (logObj.component || this.prefix) : this.prefix;

    return winstonLogger.log(level, message, logObj);
  };


  for (var lvl in winston.config.syslog.levels) {
    if (winston.config.syslog.levels.hasOwnProperty(lvl)) {
      logger[lvl] = function _block(aLevel) {
        return function (msg, obj) {
          return logger.log(aLevel, msg, obj);
        };
      }(lvl);
    }
  }
  // socket.io compatibility
  logger.warn = logger.warning;

  /*
   TODO: A log level for every logger? Each module could set its own filtering level
   logger.setLevel = function ...
   */

  return logger;
}


exports.newLogger = newLogger;
exports.setConfig = setConfig;
/*
 debug: 0,
 info: 1,
 notice: 2,
 warning: 3,
 error: 4,
 crit: 5,
 alert: 6,
 emerg: 7

 The list of syslog severity Levels:
 0 Emergency: system is unusable
 1 Alert: action must be taken immediately
 2 Critical: critical conditions
 3 Error: error conditions
 4 Warning: warning conditions
 5 Notice: normal but significant condition
 6 Informational: informational messages
 7 Debug: debug-level messages
 Recommended practice is to use the Notice or Informational level for normal messages.


 A detailed explanation of the severity Levels:
 DEBUG:
 Info useful to developers for debugging the application, not useful during operations
 INFORMATIONAL:
 Normal operational messages - may be harvested for reporting, measuring throughput, etc - no action required
 NOTICE:
 Events that are unusual but not error conditions - might be summarized in an email to developers or admins to spot potential problems - no immediate action required
 WARNING:
 Warning messages - not an error, but indication that an error will occur if action is not taken, e.g. file system 85% full - each item must be resolved within a given time
 ERROR:
 Non-urgent failures - these should be relayed to developers or admins; each item must be resolved within a given time
 ALERT:
 Should be corrected immediately - notify staff who can fix the problem - example is loss of backup ISP connection
 CRITICAL:
 Should be corrected immediately, but indicates failure in a primary system - fix CRITICAL problems before ALERT - example is loss of primary ISP connection
 EMERGENCY:
 A "panic" condition - notify all tech staff on call? (earthquake? tornado?) - affects multiple apps/servers/sites...



 */
