// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: apiconnect-microgateway
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

'use strict';
var vm    = require('vm');
var _     = require('lodash');
var logger = require('apiconnect-cli-logger/logger.js')
               .child({loc: 'apiconnect-microgateway:policies:javascript'});

function consoleProxy (log) {
  // Create a console API proxy around Bunyan-based flow logger

  /*
   logger.fatal()
   logger.error()
   logger.warn()
   logger.info()
   logger.debug()
   logger.trace()
   */

  function fatal () {
    log.fatal.apply(log, arguments);
  }

  function error () {
    log.error.apply(log, arguments);
  }

  function warn () {
    log.warn.apply(log, arguments);
  }

  function info () {
    log.info.apply(log, arguments);
  }

  function debug () {
    log.debug.apply(log, arguments);
  }

  function trace () {
    log.debug.apply(log, arguments);
  }

  return {
    log: info,
    info: info,
    error: error,
    warn: warn,
    trace: trace
  };
}

module.exports = function(config) {
  var javascriptPolicyHandler = function(props, context, flow) {
    var logger = flow.logger;
    logger.debug('ENTER javascript policy');

    if (_.isUndefined(props.source) || !_.isString(props.source)) {
      flow.fail({name:'JavaScriptError', value: 'Invalid JavaScript code'});
      return;
    }
    //need to wrap the code snippet into a function first
    try {
      var script = new vm.Script('(function() {' + props.source + '\n})()');
      //use context as this to run the wrapped function
      //and also console for logging
      var origProto = context.__proto__;
      var newProto = Object.create(context.__proto__);
      newProto.console = consoleProxy(flow.logger);
      context.__proto__ = newProto;
      script.runInNewContext(context);
      context.__proto__ = origProto;
      logger.debug('EXIT');
      flow.proceed();
    } catch (e) {
      logger.debug('EXIT with an error:%s', e);
      if ( e.name ) {
        flow.fail(e);
      } else {
        flow.fail({name: 'JavaScriptError', message: '' + e});
      }
    }
  };
  //disable param resolving
  javascriptPolicyHandler.skipParamResolving = true;
  return javascriptPolicyHandler;
};
