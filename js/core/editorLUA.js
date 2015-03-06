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
  var codeMirror;
  var codeMirrorDirty = false;
  
  function init() {    
    $('<div id="divcode" style="width:100%;height:100%;"><textarea id="code" name="code"></textarea></div>').appendTo(".editor--code .editor__canvas");
    // The code editor
    codeMirror = CodeMirror.fromTextArea(document.getElementById("code"), {
      width: "100%",
      height: "100%",
      lineNumbers: true,
      lineWrapping: true,
      matchBrackets: true,
      theme: "neat",
      mode: {name: "lua", globalVars: false},
      showTrailingSpace: true,
    });
    // When things have changed, write the modified code into local storage
    codeMirror.on("change", function(cm, changeObj) {
      if (chrome && chrome.storage && chrome.storage.local)
        chrome.storage.local.set({"CODE_JS": cm.getValue()});
    });
    LUA.addProcessor("initialised",{processor:function(data,callback){
      setCode(LUA.Config.CODE);
      callback(data);
    },module:"editorLUA"});
  }

  function getCode() {
    var r = "";
    r = codeMirror.getSelection();
    if(r === "") r = codeMirror.getValue();
    return r;
  }
  
  function setCode(code) {
    codeMirror.setValue(code);    
    codeMirrorDirty = true;
  }

  /** Called this when we switch modes from blockly - the editor needs a prod to update if the code
   * was set when it was invisible */
  function madeVisible() {
    if (codeMirrorDirty) {
      codeMirrorDirty = false;
      // important we do it a bit later so things have had time to lay out
      setTimeout(function () {
        codeMirror.refresh();
      }, 1);
    }
  }
  
  LUA.Core.EditorLUA = {
    init : init,
    getCode : getCode,
    setCode : setCode,
    madeVisible : madeVisible,
    getCodeMirror : function () { return codeMirror; }
  };
}());
