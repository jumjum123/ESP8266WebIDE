/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on ESPRUINO WebIDE from  Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  "Send to Espruino" implementation
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  
  function init() {
    // Add stuff we need
    LUA.Core.App.addIcon({ 
      id: "deploy",
      icon: "deploy", 
      title : "Send to ESP8266", 
      order: 400, 
      area: { 
        name: "code", 
        position: "top"
      }, 
      click: function() {
        LUA.Core.MenuPortSelector.ensureConnected(function() {
          LUA.Core.Code.getLUACode(function(code){
            LUA.Core.Terminal.focus(); // give the terminal focus
            LUA.callProcessor("sending");
            LUA.Core.Serial.write(code + "\n");              
          });
        });
      }
    });
    
    LUA.addProcessor("connected",{processor: function(data, callback) {
      $(".send").button( "option", "disabled", false);
      callback(data);
    },module:"send"});
    LUA.addProcessor("disconnected",{processor: function(data, callback) {
      $(".send").button( "option", "disabled", true);  
      callback(data);
    },module:"send"});     
  }
  
  LUA.Core.Send = {
    init : init,
  };
}());
