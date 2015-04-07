/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on ESPRUINO WebIDE from  Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  Initialisation code
 ------------------------------------------------------------------
**/
"use strict";

var LUA;

(function() {

  var processors = {};
  
  function init() {    
    
    LUA.Core.Config.loadConfiguration(function() {
      // Initialise all modules    
      function initModule(modName, mod) {      
        if (mod.init !== undefined)
          mod.init();
      }
      
      var module;
      for (module in LUA.Core) initModule(module, LUA.Core[module]);
      for (module in LUA.Plugins) initModule(module, LUA.Plugins[module]);
      
      callProcessor("initialised", undefined, function() {
        // We need the delay because of background.js's url_handler...
        setTimeout(function() {
          LUA.initialised = true;
        }, 1000);
      });
    });
  }
  
  if (typeof $ == "function") {
    // workaround for broken chrome on Mac
    if (navigator.userAgent.indexOf("Mac OS X")>=0 &&
        navigator.userAgent.indexOf("Chrome/33.0.1750")>=0) {
      $(document).ready(function() { window.setTimeout(init,100); });
    } else {
      $(document).ready(init);
    }
  }
  
  /** Add a processor function of type function(data,callback) */
  function addProcessor(eventType, processor) {
    if (processors[eventType]===undefined)
      processors[eventType] = [];
    processors[eventType].push(processor);
    if(typeof processor === "object"){
      if(typeof processor["maxDuration"] !== "undefined"){
        setTimeout(function(){
          removeProcessor(processor.module,eventType);
        },processor.maxDuration);
      }
    }
  }

  function removeProcessor(module,eventType){
    var p = processors[eventType];
    if(typeof p !== "undefined"){
      for(var i = 0; i < p.length; i++){
        if(typeof p[i] === "object"){
          if(p[i].module === module){
            p.splice(i,1);
            break;
          }
        }
      }  
    }
  }
  function removeProcessorsByType(eventType){processors[eventType] = [];}
  function removeProcessorsByModule(module){for(var i in processors){ removeProcessor(module,i);}}

  function checkProcessor(eventType,module){
    var r = false;
    if(typeof processors[eventType] !== "undefined"){
      if(typeof module === "undefined"){
        if(processors[eventType].length > 0) r = true;
      }
      else{
        for(var i = 0; i < processors[eventType].length; i++){ 
          if(processors[eventType][i] === module){ r = true; }
        }
      }
    }
    return r;
  }  
  /** Call a processor function */
  function callProcessor(eventType, data, callback) {
    var p = processors[eventType];
    // no processors
    if (p===undefined || p.length==0) {
      if (callback!==undefined) callback(data);
      return;
    }
    // now go through all processors
    var n = 0;
    var cb = function(inData) {
      if (n < p.length) {
        if(typeof p[n] === "function"){p[n++](inData, cb);} else{p[n++].processor(inData, cb);}        
      } else {
        if (callback!==undefined) callback(inData);
      }        
    };
    cb(data);
  }  
  
  // -----------------------------------
  LUA = { 
    Core : { }, 
    Plugins : { },
    Processors : processors,
    addProcessor : addProcessor,
    callProcessor : callProcessor,
    removeProcessor : removeProcessor,
    removeProcessorsByType : removeProcessorsByType,
    removeProcessorsByModule : removeProcessorsByModule,
    checkProcessor : checkProcessor,
    initialised : false,
    init : init, // just in case we need to initialise this by hand
  };

  return LUA;
})();


