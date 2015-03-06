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
  var macros = {};
  function init() {  }
  
  function getMacro(macroGroup,macro,callback){
    $.get("data/lua/macro/" + macroGroup + ".json",function(data){
      var m = JSON.parse(data);
      callback(m[macro]);
    });
  }
  function convertLUA(data,params){
    var r,i,j,k,re,re2,lines = [];
    for(i = 0; i < data.length;i++){
      if(params){
        for(j in params){
          if(j === "filedata"){
            re = new RegExp("\"","g");
            re2 = new RegExp("\\\\","g");
            lines = params[j].split("\n");
            for(k = 0; k < lines.length; k++){
              lines[k] = lines[k].replace(re2,"\\\\");
              lines[k] = 'file.writeline("' + lines[k].replace(re,"\\\"") + '")';
            }
          }
          else{
            re = new RegExp(j,"g");
            data[i] = data[i].replace(re,params[j]);
          }
        }
      }
    }
    return data.join(" ").replace(/filedata/,lines.join("\n"));
  }
  function getFiles() {
    getMacro("file","getFiles",function(macro){
      var r = convertLUA(macro);
      LUA.Core.Serial.write(r + "\n");    
    });
  }
  function saveFile(fileName,data){
    LUA.Core.Terminal.setEcho(false);
    getMacro("file","saveFile",function(macro){
      var r = convertLUA(macro,{"filename":fileName,"filedata":data});
      LUA.Core.Serial.write(r + "\n",false,function(){LUA.Core.Terminal.setEcho(true);});
    });
  }
  function readFile(fileName){
    LUA.Core.Terminal.setEcho(false);
    getMacro("file","readFile",function(macro){
      var r = convertLUA(macro,{"filename":fileName});
      LUA.Core.Serial.write(r + "\n");
    });
  }
  function dropFile(fileName){
    LUA.Core.Terminal.setEcho(false);
    getMacro("file","dropFile",function(macro){
      var r = convertLUA(macro,{"filename":fileName});
      LUA.Core.Serial.write(r + "\n",false,function(){LUA.Core.Terminal.setEcho(true);});
    });
  }
  function doFile(fileName){
    LUA.Core.Terminal.setEcho(false);
    getMacro("file","doFile",function(macro){
      var r = convertLUA(macro,{"filename":fileName});
      LUA.Core.Serial.write(r + "\n",false,function(){LUA.Core.Terminal.setEcho(true);});
    });
  }

  function setSerial(baudRate){
    getMacro("serial","setBaud",function(macro){
      var r,options = {};
      options.baudRate = baudRate;
      options.echo = (LUA.Config.Serial_Echo)?1:0;
      r = convertLUA(macro,options);
      LUA.Core.Serial.write(r + "\n",false,function(){
        LUA.Core.Notifications.info("Set Baudrate to " + options.baudRate);
      }); 
    });
  }
  
  LUA.Plugins.LUAfile = {
    init : init,
    getFiles : getFiles,
    saveFile : saveFile,
    readFile : readFile,
    dropFile : dropFile,
    doFile : doFile,
    setSerial : setSerial
  };
}());