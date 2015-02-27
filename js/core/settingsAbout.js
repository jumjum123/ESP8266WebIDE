/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on ESPRUINO WebIDE from  Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  'About' Settings Page 
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  
  function getVersion(callback) 
  {
    $.getJSON('manifest.json',function (manifest) {
        callback(manifest.version);
    });
  }

  function init() {
    getVersion(function(version) {
      LUA.Core.Config.addSection("About", {
        description : "About the Espruino Web IDE v"+ version,
        sortOrder : -1000,
        getHTML : function(callback) {      
          $.get("/data/settings_about.html", function(data) {
            callback(data);
          });
        }
      });
    });    
  }
  
  LUA.Core.SettingsAbout = {
    init : init,
  };
}());
