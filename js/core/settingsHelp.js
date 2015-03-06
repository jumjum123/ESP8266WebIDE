/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on ESPRUINO WebIDE from  Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  'Help' Settings Page 
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  
  function init() {
    LUA.Core.Config.addSection("Doku", {
      description : "Some Doku links around ESP8266",
      sortOrder : 1000,
      getHTML : function(callback) {      
        $.get("/data/settings_help.html", function(data) {
          callback(data);
        });
      }
    });    
  }
  
  LUA.Core.SettingsHelp = {
    init : init,
  };
}());
