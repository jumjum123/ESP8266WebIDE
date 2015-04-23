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
        if(LUA.Core.Serial.isConnected()){
          LUA.Core.Code.getLUACode(function(code){
            LUA.callProcessor("sending");
            LUA.Core.Serial.write(code + "\n");              
          });
        }
        else{ LUA.Core.Notifications.warning("Not connected to board"); }
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

  function setSerial(baudRate,echo,callback){
    getMacro("serial","setBaud",function(macro){
      var r,options = {};
      options.baudRate = baudRate;
      options.echo = (echo)?1:0;
      r = convertLUA(macro,options);
      LUA.Core.Serial.write(r + "\n",function(){
        LUA.Core.Notifications.info("Set Baudrate/echo to " + options.baudRate + "/" + options.echo);
        if(callback) callback();
      }); 
    });
  }
  function getInfo(callback){
    getMacro("serial","getInfo",function(macro){
      var r = convertLUA(macro);
      LUA.Core.Serial.write(r + "\n",function(){if(callback){callback();}}); 
    });
  }

  function getFiles(callback) {
    getMacro("file","getFiles",function(macro){
      var r = convertLUA(macro);
      LUA.Core.Serial.write(r + "\n",function(){if(callback)callback();});    
    });
  }
  function saveFile(fileName,data,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("file","saveFile",function(macro){
        var r = convertLUA(macro,{"filename":fileName,"filedata":data});
        LUA.Core.Serial.write(r + "\n",function(){if(callback)callback();});       
      });
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }
  function readFile(fileName,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("file","readFile",function(macro){
        var r = convertLUA(macro,{"filename":fileName});
        LUA.Core.Serial.write(r + "\n",function(bs){if(callback)callback();});
      });        
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }
  function dropFile(fileName,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("file","dropFile",function(macro){
        var r = convertLUA(macro,{"filename":fileName});
        LUA.Core.Serial.write(r + "\n",function(){if(callback)callback();});
      });        
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }
  function doFile(fileName,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("file","doFile",function(macro){
        var r = convertLUA(macro,{"filename":fileName});
        LUA.Core.Serial.write(r + "\n",function(){if(callback)callback();});
      });
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }
  function compileFile(fileName,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("file","compileFile",function(macro){
        var r = convertLUA(macro,{"filename":fileName});
        LUA.Core.Serial.write(r + "\n",function(){if(callback)callback();});
      });
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }

  function getPolling(funcName,data,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("serial","polling",function(macro){
        var r = convertLUA(macro,{"funcName":funcName,"varData":data});
        LUA.Core.Serial.write(r + "\n",function(bs){if(callback)callback(); });      
      });
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }

  LUA.Core.Send = {
    init : init,
    setSerial : setSerial,
    getInfo : getInfo,
    getFiles : getFiles,
    saveFile : saveFile,
    readFile : readFile,
    dropFile : dropFile,
    doFile : doFile,
    compileFile : compileFile,
    getPolling : getPolling
  };
}());
