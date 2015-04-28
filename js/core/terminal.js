/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on ESPRUINO WebIDE from  Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  VT100 terminal window
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  var onInputData = function(d){}; // the handler for character data from user 

  var displayTimeout = null;
  var waitForChar = "";
  var waitForFunc = null;
  var waitForTimer = null;
  //var displayData = [];
  // Text to be displayed in the terminal
  //var termText = [ "" ];
  // Map of terminal line number to text to display before it
  //var termExtraText = {}; 
  
  //var termCursorX = 0;
  //var termCursorY = 0;
  //var termControlChars = [];    

  // maximum lines on the terminal
  //var MAX_LINES = 2048;
  
  function init() 
  {
    // Add buttons
    if (LUA.Core.App) LUA.Core.App.addIcon({ 
      id: "clearScreen",
      icon: "clear", 
      title : "Clear Screen", 
      order: -100, 
      area: {
        name: "terminal",
        position: "top"
      },
      click: function(){
        clearTerminal();
        //focus();
      }
    });

    // Add stuff we need
    $('<div id="terminal" class="terminal"></div>').appendTo(".editor--terminal .editor__canvas");
    //$('<textarea id="terminalfocus" class="terminal__focus" rows="1" cols="1"></textarea>').appendTo(document.body);

    // Populate terminal
    $.get("data/terminal_initial.html", function (data){ $("#terminal").html(data); });
    LUA.addProcessor("connected",{processor:function(data, callback) {
      grabSerialPort();
      $("#terminal").addClass("terminal--connected");
      callback(data);
    },module:"terminal"});
    LUA.addProcessor("disconnected", {processor:function(data, callback) {
      $("#terminal").removeClass("terminal--connected");
      callback(data);
    },module:"terminal"});
  };
  
  var clearTerminal = function() {
    $("#terminal").html("");
    LUA.callProcessor("terminalClear");
  };

  function trimRight(str) {
    var s = str.length-1;
    while (s>0 && str[s]==" ") s--;
    return str.substr(0,s+1);      
  }
  
  /// Called when data comes OUT of LUA INTO the terminal
  function outputDataHandler(readData) {
    var bufString = "",bufView=new Uint8Array(readData);
    for(var i = 0; i < bufView.length; i++) { bufString += String.fromCharCode(bufView[i]);}
    if(LUA.Config.Debug_SerialReceive === true){console.log("< <",bufString);}
    if(waitForTimer !== null){
      if(bufString.indexOf(waitForChar) >= 0){
        clearTimeout(waitForTimer);
        waitForTimer = null;
        waitForFunc(true);
      }
    }
    if(LUA.checkProcessor("getWatched")){searchData(bufString);}
    else{ $("#terminal").html($("#terminal").html() + bufString.replace(/\n/g,"<br>"));}
  }

  var receivedData = "";
  function searchData(data){
    var si,ei,r = false;
    receivedData += data;
    si = receivedData.indexOf("<<<<<");
    if(si >= 0){ 
      receivedData = receivedData.substr(si);
      ei = receivedData.indexOf(">>>>>");
      if(ei > 0){
        receivedData = receivedData.substr(5,ei - 5);
        LUA.callProcessor("getWatched",receivedData,function(){});
        receivedData = "";
        r = true;
      }
    }
    else{ if(receivedData.length > 200) receivedData = receivedData.substr(100); }
    return r;
  }
  
  /// Claim input and output of the Serial port
  function grabSerialPort() {
    // Ensure that keypresses go direct to the LUA device
    //LUA.Core.Terminal.setInputDataHandler(function(d) {
    //  LUA.Core.Serial.write(d);
    //});
    // Ensure that data from LUA goes to this terminal
    LUA.Core.Serial.startListening(LUA.Core.Terminal.outputDataHandler);
    LUA.Core.Send.setSerial(9600,false,function(){ LUA.Core.Send.getInfo(); });
  };

  /// Give the terminal focus
  //function focus() {
  //  $("#terminalfocus").focus(); 
  //};
  function setWaitFor(waitFor,duration,callback){
    waitForChar = waitFor;
    waitForFunc = callback;
    if(waitForTimer)clearTimeout(waitForTimer);
    waitForTimer = setTimeout(function(){console.log("timeout false");callback(false);},duration);
  }

  LUA.Core.Terminal = {
      init : init,
      //focus : focus, // Give this focus
      grabSerialPort : grabSerialPort,
      outputDataHandler : outputDataHandler,
      setWaitFor : setWaitFor   
  };

})();
