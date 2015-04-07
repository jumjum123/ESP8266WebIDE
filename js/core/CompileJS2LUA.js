/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on ESPRUINO WebIDE from  Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  CodeMirror JavaScript editor
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  var viewCompileButton;
  function init() {    
    viewCompileButton = LUA.Core.App.addIcon({ 
      id: "compile",
      icon: "lightning", 
      title : "Compile JS to LUA", 
      order: -1, 
      area: {
        name: "code",
        position: "bottom"
      },
      click: compilePopup
    });
  }
  function compilePopup(){
    $.get("data/compileJS2LUA.html",function(data){
      var html = data,js = "",lua="";
      LUA.Core.App.closePopup();
      LUA.Core.App.openPopup({
        position: "relative",title: "JS 2 LUA",id: "JS2LUACode",contents: html
      });
      setTimeout(function(){
        js = $("#js2luaCode").val();
        $("#compile2LUA").unbind().click(function(){ 
          lua = colonize(js,{embedLineNumbers:true,noExports:true,noLineNumbers:true});
          $("#compiledCode").html("<pre>" + lua.source + "</pre>");
        });
        $("#copyCompile2Code").unbind().click(function(){
          lua = "--[[translated from\n" + js + "\n]]\n" + lua.source + "\n-- end compiled from JS\n"
              + LUA.Core.EditorLUA.getCode();
          LUA.Core.EditorLUA.setCode(lua);
          LUA.Core.App.closePopup();
        });
      },50);     
    })  
    
  }
  
  LUA.Core.ComplieJS2LUA = {
    init : init,
  };
}());
