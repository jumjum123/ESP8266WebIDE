/**
 Copyright 2014 Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  Handling the getting and setting of code
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  
  var viewModeButton;

  function init() {
    // Configuration
    LUA.Core.Config.add("AUTO_SAVE_CODE", {
      section : "Communications",
      name : "Auto Save",
      description : "Save code to Chrome's cloud storage when clicking 'Send to Espruino'?",
      type : "boolean",
      defaultValue : true, 
    });    

    // Setup code mode button
    viewModeButton = LUA.Core.App.addIcon({ 
      id: "code",
      icon: "code", 
      title : "Switch between Code and Graphical Designer", 
      order: 0, 
      area: {
        name: "code",
        position: "bottom"
      },
      click: function() {
        if (isInBlockly()) {
          switchToCode();
          LUA.Core.EditorLUA.madeVisible();
        } else {
          switchToBlockly();
        }
      }
    });

    // get code from our config area at bootup
    LUA.addProcessor("initialised", function(data,callback) {
      var code;
      if (LUA.Config.CODE) {
        code = LUA.Config.CODE;
//console.log("Loaded code from storage.");
      } else {
        code = "var  l = false;\nsetInterval(function() {\n  l = !l;\n  LED1.write(l);\n}, 500);";
        console.log("No code in storage.");
      }
      LUA.Core.EditorLUA.setCode(code);
      callback(data);
    });
    
    
    LUA.addProcessor("sending", function(data, callback) {
      if(LUA.Config.AUTO_SAVE_CODE)
        LUA.Config.set("CODE", LUA.Core.EditorLUA.getCode(true)); // save the code
      callback(data);
    });
  }
  
  function isInBlockly() { // TODO: we should really enumerate views - we might want another view?
    return $("#divblockly").is(":visible");
  };

  function switchToBlockly() {
    $("#divcode").hide();
    $("#divblockly").show();
    viewModeButton.setIcon("block");
  }

  function switchToCode() {
    $("#divblockly").hide();
    $("#divcode").show();
    viewModeButton.setIcon("code");
  }

  function getLUACode(callback) {
    var code = getCurrentCode();
    LUA.callProcessor("transformForLUA", code, callback);
  }
  
  function getCurrentCode() {
    var r = ""
    if (isInBlockly()) {
      r = LUA.Core.EditorBlockly.getCode();
    } else {
      r = LUA.Core.EditorLUA.getCode();
    }
    return r;
  }
  
  LUA.Core.Code = {
    init : init,
    getLUACode : getLUACode, // get the currently selected bit of code ready to send to ESP8266 
    getCurrentCode : getCurrentCode, // get the currently selected bit of code (either blockly or javascript editor)
    isInBlockly: isInBlockly,
    switchToCode: switchToCode,
    switchToBlockly: switchToBlockly
  };
}());