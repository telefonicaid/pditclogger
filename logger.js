//
// Copyright (c) Telefonica I+D. PDI  All rights reserved.
//
//

/*
 * Since Winston has a predefined log style define in 'common' module, it's necessary to modify this module
 * in order to accomplish TID Log Style guide. 'personalizedCommon.js' modifies that module and it's necessary
 * to be required even if not used.
 */

var util = require('util');
var common = require('./personalizedCommon.js');
var winston = require('winston');
var os = require('os');
var logger = null;

var hostname = os.hostname();
var myWinston = null;

var config = {
  logLevel: 'debug',
  inspectDepth: 2,
  Console: {
    level: 'debug', timestamp: true
  },
  File: {
    //FIXME: Filename should be changed to meet PID requirements
    level: 'debug', filename: 'pditclogger.log', timestamp: true, json: false
  }
};

function timestamp() {

  function pad(number) {
    var stringValue = String(number);
    if ( stringValue.length === 1 ) {
      stringValue = '0' + stringValue;
    }
    return stringValue;
  }

  var date = new Date();
  return date.getUTCFullYear()
      + '-' + pad( date.getUTCMonth() + 1 )
      + '-' + pad( date.getUTCDate() )
      + ' ' + pad( date.getUTCHours() )
      + ':' + pad( date.getUTCMinutes() )
      + ':' + pad( date.getUTCSeconds() )
      + '.' + String( (date.getUTCMilliseconds()/1000).toFixed(3) ).slice( 2, 5 )
      + 'Z';
}

function setConfig(newCfg) {
  "use strict";

  config = newCfg;
  createWinston(config);
}

function createWinston(cfg) {
  "use strict";
  myWinston = new (winston.Logger)({
    level: cfg.logLevel,
    transports: [
      new (winston.transports.Console)(cfg.Console),
      new (winston.transports.File)(cfg.File)
    ]
  });

  myWinston.setLevels(winston.config.syslog.levels);
}

function newLogger() {
  "use strict";

  if (myWinston === null) {
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
  logger.log = function (level, logObj, obj) {
    if (myWinston.levels[level] < myWinston.levels[config.logLevel]) {
      return;
    }

    try {

      //Compatibility with older versions
      if (typeof logObj === 'string') {
        logObj = { msg: logObj };
      }

      var msg = '';

      //PDI Format
      msg += timestamp() + ' | ';                                                               //Timestamp
      msg += os.hostname() + ' | ';                                                             //Machine
      msg += (logObj.component ? logObj.component : (this.prefix ? this.prefix : '?')) + ' | '; //Component
      msg += level.toUpperCase() + ' | ';                                                       //Log level
      msg += (logObj.traceID ? logObj.traceID : 'N/A') + ' | ';                                 //Trace ID
      msg += (logObj.userID ? logObj.userID : 'SYSTEM') + ' | ';                                //User ID
      msg += (logObj.opType ? logObj.opType : 'DEFAULT') + ' | ';                               //Op Type
      msg += (logObj.msg ? logObj.msg : '');                                                    //User message

      if (obj !== null && obj !== undefined) {

        msg += ' ';

        if (util.isArray(obj)) {
          if (obj.length > 0) {
            msg += util.inspect(obj[0], false, config.inspectDepth);
          }
          for (var ix = 1; ix < obj.length; ix++) {
            msg += ', ' + util.inspect(obj[ix], false, config.inspectDepth);
          }

        }
        else {
          msg += util.inspect(obj, false, config.inspectDepth);
        }
      }
      return myWinston.log(level, msg.replace(/\n/g, ''));
      //console.log(prefix + msg);
    }
    catch (e) {
      console.log(e);
    }
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
