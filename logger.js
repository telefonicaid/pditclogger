//
// Copyright (c) Telefonica I+D. PDI  All rights reserved.
//
//

var util = require('util');
var winston = require('winston');
var logger = null;

var myWinston = null;
var config = {
    logLevel:'debug',
    inspectDepth:2,
    Console:{
        level:'debug', timestamp:true
    },
    File:{
        level:'debug', filename:'pditclogger.log', timestamp:true, json:false
    }
};

function setConfig(newCfg) {
    "use strict";

    config = newCfg;
    createWinston(config);
}

function createWinston(cfg) {
    "use strict";
    myWinston = new (winston.Logger)({
        level:cfg.logLevel,
        transports:[
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
    logger.log = function (level, msg, obj) {
        if (myWinston.levels[level] < myWinston.levels[config.logLevel]) {
            return;
        }

        try {
            var prefix = this.prefix === undefined ? '[?]' : '[' + this.prefix + '] ';

            if (obj !== null && obj !== undefined) {
                if (util.isArray(obj)) {
                    msg +=" [ ";
                    if(obj.length>0) {
                        msg += util.inspect(obj[0], false, config.inspectDepth); 
                    }
                    for (var ix = 1; ix < obj.length; ix++) {
                        msg += ', ' + util.inspect(obj[ix], false, config.inspectDepth);
                    }
                    msg +=" ] ";

                }
                else {
                    msg += ' ' + util.inspect(obj, false, config.inspectDepth);
                }
            }
            return myWinston.log(level, prefix + msg.replace(/\n/g,""));
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
