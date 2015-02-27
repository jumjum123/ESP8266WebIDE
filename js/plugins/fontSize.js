/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on ESPRUINO WebIDE from  Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  An Example Plugin
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  
  function init() {
    LUA.Core.Config.add("FONT_SIZE", {
      section : "General",
      name : "Font Size",
      description : "The size of font used in the Terminal and Code Editor windows",
      type : {8:8,10:10,12:12,14:14,18:18,24:24,32:32},
      defaultValue : 12, 
      onChange :setFontSize
    });
    
    setFontSize(LUA.Config.FONT_SIZE);
  }
  
  function setFontSize(size) {
    $("#terminal,.CodeMirror").css("font-size", size+"px");
  }
  
  LUA.Plugins.FontSize = {
    init : init,
  };
}());