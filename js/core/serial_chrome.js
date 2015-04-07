/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on 
   Copyright 2012 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Renato Mangini (mangini@chromium.org)
Author: Luis Leao (luisleao@gmail.com)
Author: Gordon Williams (gw@pur3.co.uk)

**/

(function() {
  if (typeof chrome === 'undefined' || chrome.serial===undefined) return;
  if (chrome.serial.getDevices===undefined) {
    // wrong chrome version
    console.log("Chrome does NOT have post-M33 serial API");
    return;
  }  

  function init() {
    LUA.Core.Config.add("BAUD_RATE", {
      section : "Communications",
      name : "Baud Rate",
      description : "When connecting over serial, this is the baud rate that is used. 9600 is the default for LUA",
      type : {9600:9600,19200:19200,38400:38400,57600:57600,74880:74880,115200:115200},
      defaultValue : 9600,
      onChange : setBaud
    });
    LUA.Core.Config.add("Serial_Echo",{
      section : "Communications",
      name : "Echo Serial",
      description : "Switch echo on/off",
      type : "boolean",
      defaultValue : true,
      onChange : setEcho
    });
    LUA.Core.Config.add("Debug_SerialSend",{
      section : "Communications",
      name : "Debug Serial Send",
      description : "Logs chars sent to serial port",
      type : "boolean",
      defaultValue : false 
    });
    LUA.Core.Config.add("Debug_SerialReceive",{
      section : "Communications",
      name : "Debug Serial Receive",
      description : "Logs chars received from serial port",
      type : "boolean",
      defaultValue : false 
    });
  }  
  
  var connectionInfo;
  var readListener;
  var connectedPort; // unused?
  var connectionDisconnectCallback;

  // For throttled write
  var writeData = undefined;

  function setBaud(baudRate){
    //LUA.Plugins.LUAfile.setSerial(baudRate,LUA.Config.Serial_Echo);
  }
  function setEcho(echo,callback){ LUA.Core.Send.setSerial(9600,echo,callback); }
  
  var startListening=function(callback) {
    var oldListener = readListener;
    readListener = callback;
    return oldListener;
  };

  var getPorts=function(callback) {
    chrome.serial.getDevices(function(devices) {

      var prefix = "";    
      if (navigator.userAgent.indexOf("Linux")>=0) {
        hasSlashes = false;
        devices.forEach(function(device) { if (device.path.indexOf("/")>=0) hasSlashes=true; });
        if (!hasSlashes) prefix = "/dev/";
      }

      callback(devices.map(function(device) {
        return prefix+device.path;
      }));
    });
  };
  
  var openSerial=function(serialPort, openCallback, disconnectCallback) {
    connectionDisconnectCallback = disconnectCallback;
    chrome.serial.connect(serialPort, {bitrate: parseInt(LUA.Config.BAUD_RATE)}, 
      function(cInfo) {
        if (!cInfo) {
          console.log("Unable to open device (connectionInfo="+cInfo+")");
          openCallback(undefined);
        } else {
          connectionInfo = cInfo;
          connectedPort = serialPort;
          LUA.callProcessor("connected", undefined, function() {
            openCallback(cInfo);
          });          
        }        
    });
  };

  var writeSerialDirect = function(str,callback) {
    if(LUA.Config.Debug_SerialSend === true){ console.log("> >",str);}
    chrome.serial.send(connectionInfo.connectionId, str2ab(str), function(a) {callback(a.bytesSent);}); 
  };

  var str2ab=function(str) {
    var buf=new ArrayBuffer(str.length);
    var bufView=new Uint8Array(buf);
    for (var i=0; i<str.length; i++) {
      bufView[i]=str.charCodeAt(i);
    }
    return buf;
  };
  
  var closeSerial=function(callback) {
   writeData = undefined;

   connectionDisconnectCallback = undefined;
   if (connectionInfo) {
     chrome.serial.disconnect(connectionInfo.connectionId, 
      function(result) {
        connectionInfo=null;
        LUA.callProcessor("disconnected");
        if (callback) callback(result);
      });
    }
  };
   
  var isConnected = function() {
    return connectionInfo!=null && connectionInfo.connectionId>=0;
  };

  // Throttled serial write
  var writeSerial = function(data,callback){
    if (!isConnected()) return;
    if (writeData === undefined) writeData = data; else writeData += data;
    function sendIt(){
      var wd,wdl;
      wd = writeData.split("\n");
      if(wd.length === 1) {
        writeSerialDirect(writeData,function(bs){
          writeData = "";
          if(callback) callback();            
        });
      }
      else{
        wdl = $.trim(wd[0]);
        if(wdl.length > 0) writeSerialDirect(wdl + "\n",function(bs){nextLine(); });
        else{ nextLine();}
      }
      function nextLine(){
        wd.shift();
        writeData = wd.join("\n");
        if(wd.length > 0){ setTimeout(function(){sendIt();},200); }
        else{ console.log(">> All sent"); if(callback) callback();}          
      }
    }
    sendIt();
  }
  
  // ----------------------------------------------------------
  chrome.serial.onReceive.addListener(function(receiveInfo) {
    if (readListener!==undefined) readListener(receiveInfo.data);
  });

  chrome.serial.onReceiveError.addListener(function(errorInfo) {
    console.log("RECEIVE ERROR:",JSON.stringify(errorInfo));
    connectionDisconnectCallback();
  });

  LUA.Core.Serial = {
    "init" : init,
    "getPorts": getPorts,
    "open": openSerial,
    "isConnected": isConnected,
    "startListening": startListening,
    "write": writeSerial,
    "close": closeSerial,
    "setEcho" : setEcho
  };
})();
