/**
 Copyright 2014 Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  Automatically minify code before it is sent to Espruino
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  
  var minifyUrl = "http://closure-compiler.appspot.com/compile";
  var minifyCache = [];
  
  function init() {
    LUA.Core.Config.addSection("Minify", {
      sortOrder:600,
      description: "Options for minfy handling"
    });
    LUA.Core.Config.add("MINIFICATION_Enabled",{
      section : "Minify",
      name : "Enabled (LUA is limited to linelength<256, in this case we will send unminified)",
      description : "Enable minify before sending source to ESP8266",
      type : "boolean",
      defaultValue : true
    });    
    // When code is sent to ESP8266, search it for modules and add extra code required to load them 
    LUA.addProcessor("transformForLUA", minifyLUA);
  }
  function minifyLUA(code,callback){
    if(LUA.Config.MINIFICATION_Enabled === true){
      var minified = luamin.minify(code);
      if(minified.length > 255){
        LUA.Core.Notifications.warning("Sorry, minified is too long, limit ist 255 chars/line, sending unminified");
        callback(code);
      }
      else{ callback(minified);}     
    }
    else{
      callback(code);
    }
  }
  
  LUA.Plugins.Minify = {
    init : init,
  };
}());
