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
  var displayData = [];
  // Text to be displayed in the terminal
  var termText = [ "" ];
  // Map of terminal line number to text to display before it
  var termExtraText = {}; 
  
  var termCursorX = 0;
  var termCursorY = 0;
  var termControlChars = [];    

  // maximum lines on the terminal
  var MAX_LINES = 2048;
  
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
        focus();
      }
    });

    // Add stuff we need
    $('<div id="terminal" class="terminal"></div>').appendTo(".editor--terminal .editor__canvas");
    $('<textarea id="terminalfocus" class="terminal__focus" rows="1" cols="1"></textarea>').appendTo(document.body);

    // Populate terminal
    $.get("data/terminal_initial.html", function (data){
      $("#terminal").html(data);
    });
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
    // Get just the last entered line
    var currentLine = getInputLine();
    if (currentLine==undefined)
      currentLine = { text : "" };
    termText = currentLine.text.split("\n");
    // re-add > and : marks
    for (var l in termText)
      termText[l] = (l==0?">":":") + termText[l]; 
    // reset other stuff...
    termExtraText = {}; 
    // leave X cursor where it was...
    termCursorY -= currentLine.line; // move Y cursor back
    termControlChars = [];   
    // finally update the HTML
    updateTerminal();
    // fire off a clear terminal processor
    LUA.callProcessor("terminalClear");
  };

  var updateTerminal = function() {  
    var terminal = $("#terminal");
    // gather a list of elements for each line
    var elements = [];
    terminal.children().each(function() {
      var n = $(this).attr("lineNumber");
      if (n!==undefined)
        elements[n] = $(this);
      else
        $(this).remove(); // remove stuff that doesn't have a line number
    });
    
    // remove extra lines if there are too many
    if (termText.length > MAX_LINES) {
      var removedLines = termText.length - MAX_LINES;
      termText = termText.slice(removedLines);
      termCursorY -= removedLines;
      var newTermExtraText = {};
      for (var i in termExtraText) {
        if (i>=removedLines) 
          newTermExtraText[i-removedLines] = termExtraText[i];
      }
      termExtraText = newTermExtraText;
      
      // now renumber our elements (cycle them around)
      var newElements = [];
      for (i in elements) {
        var n = elements[i].attr("lineNumber") - removedLines;
        if (n<0) { // if it's fallen off the bottom, delete it
          elements[i].remove();
        } else {
          elements[i].attr("lineNumber", n);
          newElements[n] = elements[i];
        }
      }
      elements = newElements;
    }   
    // remove elements if we have too many...
    for (i=termText.length;i<elements.length;i++)
      if (i in elements) 
        elements[i].remove();
    // now write this to the screen
    var t = [];
    for (var y in termText) {
      var line = termText[y];
      if (y == termCursorY) {
        var ch = LUA.Core.Utils.getSubString(line,termCursorX,1);
        line = LUA.Core.Utils.escapeHTML(
            LUA.Core.Utils.getSubString(line,0,termCursorX)) + 
            "<span class='terminal__cursor'>" + LUA.Core.Utils.escapeHTML(ch) + "</span>" + 
            LUA.Core.Utils.escapeHTML(LUA.Core.Utils.getSubString(line,termCursorX+1));
      } else
        line = LUA.Core.Utils.escapeHTML(line);
      // extra text is for stuff like tutorials
      if (termExtraText[y])
        line = termExtraText[y] + line;
      
      // Only update the elements if they need updating
      if (elements[y]===undefined) {
        var prev = y-1;
        while (prev>=0 && elements[prev]===undefined) prev--;
        elements[y] = $("<div class='termLine' lineNumber='"+y+"'>"+line+"</div>");
        if (prev<0) elements[y].appendTo(terminal);
        else elements[y].insertAfter(elements[prev]);
      } else if (elements[y].html()!=line)
        elements[y].html(line);
    }
    // now show the line where the cursor is
    if (elements[termCursorY]!==undefined);
      elements[termCursorY][0].scrollIntoView();
  };

  function trimRight(str) {
    var s = str.length-1;
    while (s>0 && str[s]==" ") s--;
    return str.substr(0,s+1);      
  }
  
  var handleReceivedCharacter = function (/*char*/ch) {
    //console.log("IN = "+ch);
    if (termControlChars.length==0) {        
      switch (ch) {
        case  8 : {
          if (termCursorX>0) termCursorX--;
        } break;
        case 10 : { // line feed
          termCursorX = 0; termCursorY++;
          while (termCursorY >= termText.length) termText.push("");
        } break;
        case 13 : { // carriage return
          termCursorX = 0;           
        } break;
        case 27 : {
          termControlChars = [ 27 ];
        } break;
        case 19 : break; // XOFF
        case 17 : break; // XON
        default : {
          // Else actually add character
          termText[termCursorY] = trimRight(
              LUA.Core.Utils.getSubString(termText[termCursorY],0,termCursorX) + 
              String.fromCharCode(ch) + 
              LUA.Core.Utils.getSubString(termText[termCursorY],termCursorX+1));
          termCursorX++;
        }
      }
   } else if (termControlChars[0]==27) {
     if (termControlChars[1]==91) {
       if (termControlChars[2]==63) {
         if (termControlChars[3]==55) {
           if (ch!=108)
             console.log("Expected 27, 91, 63, 55, 108 - no line overflow sequence");
           termControlChars = [];
         } else {
           if (ch==55) {
             termControlChars = [27, 91, 63, 55];
           } else termControlChars = [];
         }
       } else {
         termControlChars = [];
         switch (ch) {
           case 63: termControlChars = [27, 91, 63]; break;
           case 65: if (termCursorY > 0) termCursorY--; break; // up  FIXME should add extra lines in...
           case 66: termCursorY++; while (termCursorY >= termText.length) termText.push(""); break;  // down FIXME should add extra lines in...
           case 67: termCursorX++; break; // right
           case 68: if (termCursorX > 0) termCursorX--; break; // left
           }           
         }
       } else {
         switch (ch) {
           case 91: {
             termControlChars = [27, 91];      
           } break;
           default: {
             termControlChars = [];      
           }
         }
       }
     } else termControlChars = [];         
  };    
    
  /// Called when data comes OUT of LUA INTO the terminal
  function outputDataHandler(readData) {
    var bufString = "",bufView=new Uint8Array(readData);
    for(var i = 0; i < bufView.length; i++) { bufString += String.fromCharCode(bufView[i]);}
    if(LUA.Config.Debug_SerialReceive === true){console.log("< <",bufString);}
    if(LUA.checkProcessor("getWatched")){
      searchData(bufString);
    }
    else{
      for (var i=0;i<bufView.length;i++) displayData.push(bufView[i]);
        // If we haven't had data after 50ms, update the HTML
      if (displayTimeout == null){
        displayTimeout = window.setTimeout(function() {
          for (i in displayData) handleReceivedCharacter(displayData[i]);
          updateTerminal();
          displayData = [];
          displayTimeout = null;
        }, 100);
      }
    }
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

  function getInputLine(n) {
    if (n===undefined) n=0;
    var startLine = termText.length-1;
    while (startLine>=0 && !(n==0 && termText[startLine].substr(0,1)==">")) {
      if (termText[startLine].substr(0,1)==">") n--;
      startLine--;
    }
    if (startLine<0) return undefined;
    var line = startLine;
    var text = termText[line++].substr(1);
    while (line < termText.length && termText[line].substr(0,1)==":")
      text += "\n"+termText[line++].substr(1);
    return { line : startLine, text : text };
  };

  /// Give the terminal focus
  function focus() {
    $("#terminalfocus").focus(); 
  };

  LUA.Core.Terminal = {
      init : init,
      focus : focus, // Give this focus
      grabSerialPort : grabSerialPort,
      outputDataHandler : outputDataHandler,    
  };

})();
