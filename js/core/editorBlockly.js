/**
 Copyright 2014 Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  Handle The Blockly view!
 ------------------------------------------------------------------
**/
"use strict";
(function(){

  var Blockly;
  
  window.blocklyLoaded = function(blockly, blocklyWindow) { // see blockly/blockly.html    
    Blockly = blockly;
    if (blocklyWindow) {
      blocklyWindow.promptAsync = function(title,value,callback) {
        var popup = LUA.Core.App.openPopup({
          title: "Graphical Editor:",
          padding: true,
          contents: '<p>'+LUA.Core.Utils.escapeHTML(title)+'</p>'+
                     '<input id="promptinput" value="'+LUA.Core.Utils.escapeHTML(value)+'" style="width:100%"/>' ,                
          position: "center",
          next : function() {
            var value = $('#promptinput').val();
            popup.close();
            callback(value);
          }
        });
        $('#promptinput').focus();

      };
    }
  };
  
  function init() {
    var html = "";
    // Config
    LUA.Core.Config.add("BLOCKLY_TO_JS", {
      section : "General",
      name : "Overwrite JavaScript with Graphical Editor",
      description : "When you click 'Send to Espruino', should the code from the Graphical Editor overwrite the JavaScript code in the editor window?",
      type : "boolean",
      defaultValue : false, 
    });          
    
    // Add the HTML we need
    html = '<button id="ShowBlocklyCode">ShowCode</button>';
    html += '<button id="copyBlockly2Edit">Replace in editor</button>';
    html += '<button id="appendBlockly2Edit">Append to Editor</button>';
    html += '<iframe id="divblockly" class="blocky" style="display:none;border:none;" src="blockly/blockly.html"></iframe>';    
    $(html).appendTo(".editor--code .editor__canvas");
    $("#ShowBlocklyCode").button({ text:false, icons: { primary: "ui-icon-script"} }).unbind().click(showBlocklyCode);;
    $("#copyBlockly2Edit").button({ text:false, icons: { primary: " ui-icon-circle-triangle-n"} }).unbind().click(function(){
      LUA.Core.Code.switchToCode();
      LUA.Core.EditorLUA.setCode(Blockly.Lua.workspaceToCode('LUA'));
    });
    $("#appendBlockly2Edit").button({ text:false, icons: { primary: "ui-icon-plusthick"} }).unbind().click(function(){
      LUA.Core.Code.switchToCode();
      LUA.Core.EditorLUA.setCode(LUA.Core.EditorLUA.getCode() + "\n" + Blockly.Lua.workspaceToCode('LUA')); 
    });

    // Handle the 'sending' processor so we can update the JS if we need to...
    LUA.addProcessor("sending", function(data, callback) {
      if(LUA.Config.BLOCKLY_TO_JS && LUA.Core.Code.isInBlockly())
        LUA.Core.EditorJavaScript.setCode( "// Code from Graphical Editor\n"+LUA.Core.EditorBlockly.getCode() ); 
      callback(data);
    });
    // when we get JSON for the board, pass it to blockly
    LUA.addProcessor("boardJSONLoaded", function (data, callback) {
      if (Blockly!==undefined && Blockly.setBoardJSON!==undefined)
        Blockly.setBoardJSON(data);
      callback(data);
    });
  }
  function showBlocklyCode(){
    var code = Blockly.Lua.workspaceToCode('LUA');
    code = LUA.Core.Utils.escapeHTML(code).replace(/\n/g,"<br>")
    var xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(Blockly.mainWorkspace));
    xml = LUA.Core.Utils.escapeHTML(xml).replace(/\n/g,"<br>");
    var html = '<table border="1"><tr><th align="center">LUA Code</th></tr><tr><th><code>' + code + '</code></th></tr>';
    html += '<tr><th align="center">XML</th></tr><tr><th><code>' + xml + '</code></th></tr><table>';
    LUA.Core.App.openPopup({position: "relative",title: "LUA_Source",id: "LUASource",contents: html});
  }
  function getCode() {
    return Blockly.LUA.workspaceToCode('JavaScript');
  }
  
  function getXML() {
    return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(Blockly.mainWorkspace));
  }
  
  function setXML(xml) {
    Blockly.mainWorkspace.clear();
    Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, Blockly.Xml.textToDom(xml));
  }
    
  LUA.Core.EditorBlockly = {
    init : init,
    blockly : Blockly,
    getCode : getCode,
    getXML : getXML,
    setXML : setXML,
  };
}());
