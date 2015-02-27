/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on ESPRUINO WebIDE from  Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  Utilities
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  
  function init() {  }  
  function isWindows() {return navigator.userAgent.indexOf("Windows")>=0; }  
  function getChromeVersion(){return parseInt(window.navigator.appVersion.match(/Chrome\/(.*?) /)[1].split(".")[0]);}  
  function escapeHTML(text, escapeSpaces) 
  {
    escapeSpaces = typeof escapeSpaces !== 'undefined' ? escapeSpaces : true;

    var chr = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;', ' ' : (escapeSpaces ? '&nbsp;' : ' ') };
    
    return text.toString().replace(/[\"&<> ]/g, function (a) { return chr[a]; });    
  }
  function getSubString(str, from, len) {
    if (len == undefined) {
      return str.substr(from, len);
    } else {
      var s = str.substr(from, len);
      while (s.length < len) s+=" ";
      return s;
    }
  };  
    
  /** Try and get a prompt from LUA - if we don't see one, issue Ctrl-C
   * and hope it comes back. */
  function getLUAPrompt(callback) {
    var  receivedData = "";

    var prevReader = LUA.Core.Serial.startListening(function (readData) {
      var bufView = new Uint8Array(readData);
      for(var i = 0; i < bufView.length; i++) {
        receivedData += String.fromCharCode(bufView[i]);
      }
      if (receivedData[receivedData.length-1] == ">") {
        console.log("Found a prompt... good!");
        clearTimeout(timeout);
        nextStep();         
      }        
    });      
    // timeout in case something goes wrong...
    var timeout = setTimeout(function() {          
      console.log("Got "+JSON.stringify(receivedData));          
      // if we haven't had the prompt displayed for us, Ctrl-C to break out of what we had
      console.log("No Prompt found, got "+JSON.stringify(receivedData[receivedData.length-1])+" - issuing Ctrl-C to try and break out");
      LUA.Core.Serial.write('\x03');
      nextStep();
    },500);        
    // when we're done...
    var nextStep = function() {
      // send data to console anyway...
      prevReader(receivedData);
      receivedData = "";
      // start the previous reader listening again
      LUA.Core.Serial.startListening(prevReader);          
      // call our callback
      callback();
    };
    // send a newline, and we hope we'll see '=undefined\r\n>'
    LUA.Core.Serial.write('\n');      
  };  
  function versionToFloat(version) {
    return parseFloat(version.trim().replace("v","."));
  };    
  /** Make an HTML table out of a simple key/value object */
  function htmlTable(obj) {
    var html = '<table>';
    for (var key in obj) {
      html += '<tr><th>'+LUA.Core.Utils.escapeHTML(key)+'</th><td>'+LUA.Core.Utils.escapeHTML(obj[key])+'</td></tr>';
    }
    return html + '</table>';
  }
  function markdownToHTML(markdown) {
    var html = markdown;
    //console.log(JSON.stringify(html));
    html = html.replace(/\n\s*\n/g, "\n<br/><br/>\n"); // newlines
    html = html.replace(/\*\*(.*)\*\*/g, "<strong>$1</strong>"); // bold
    html = html.replace(/```(.*)```/g, "<span class=\"code\">$1</span>"); // code
    //console.log(JSON.stringify(html));
    return html;
  };  
  /// Gets a URL, and returns callback(data) or callback(undefined) on error
  function getURL(url, callback) {
    LUA.callProcessor("getURL", { url : url, data : undefined }, function(result) {
      if (result.data!==undefined) {
        callback(result.data);
      } else {
        $.get( url, callback, "text" ).fail(function() {
          callback(undefined);
        });
      }
    });
  }
  function isURL(text) {return (new RegExp( '(http|https)://' )).test(text);}
  
  LUA.Core.Utils = {
      init : init,
      isWindows : isWindows,   
      getChromeVersion : getChromeVersion,
      escapeHTML : escapeHTML,
      getSubString : getSubString,
      getLUAPrompt : getLUAPrompt,
      versionToFloat : versionToFloat,
      htmlTable : htmlTable,
      markdownToHTML : markdownToHTML,
      getURL : getURL,
      isURL : isURL,
  };
}());
