/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on ESPRUINO WebIDE from  Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  Central place to store and retrieve Options
  
  To use this, on your plugin's `init` function, do something like the
  following:
  
  Espruino.Core.Config.add("MAX_FOOBARS", {
    section : "Communications",           // Heading this will come under in the config screen
    name : "Foobars",                     // Nice name 
    description : "How many foobars?",    // More detail about this
    type : "int"/"boolean"/"string"/{ value1:niceName, value2:niceName },
    defaultValue : 20, 
    onChange : function(newValue) { ... }
  });
  
    * onChange will be called whenever the value changes from the default
      (including when it is loaded)
  
  Then use: 
  
  Espruino.Config.MAX_FOOBARS in your code
 ------------------------------------------------------------------
**/
"use strict";
(function() {
  
  /** See addSection and getSections */
  var builtinSections = {};

  function _get(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get( "CONFIGS", function (data) { 
        var value = data["CONFIGS"];
        console.log("GET chrome.storage.sync = "+JSON.stringify(value));
        callback(value);
      });
    } else {
      callback({});
    }
  }

  function _set(data) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      console.log("SET chrome.storage.sync = "+JSON.stringify(data));
      chrome.storage.sync.set({ CONFIGS : data });    
    }
  }
  
  function loadConfiguration(callback) {
    _get(function (value) {
      for (var key in value) { 
        if (key=="set") continue;
        LUA.Config[key] = value[key];
        if (LUA.Core.Config.data[key] !== undefined &&
            LUA.Core.Config.data[key].onChange !== undefined)
          LUA.Core.Config.data[key].onChange(value[key]);
      }  
      if (callback!==undefined)
        callback();
    });
  }
  
  function init() {
    addSection("General", { sortOrder:100, description: "General Web IDE Settings" });
    addSection("Communications", { sortOrder:200, description: "Settings for communicating with the ESP8266 Board" });
  }
  
  function add(name, options) {
    LUA.Core.Config.data[name] = options;
    if (LUA.Config[name] === undefined)
      LUA.Config[name] = options.defaultValue;
  }
  
  /** Add a section (or information on the page).
   * options = {
   *   sortOrder : int, // a number used for sorting
   *   description : "",
   *   getHTML : function(callback(html)) // optional
   * };
   */
  function addSection(name, options) {
    options.name = name;
    builtinSections[name] = options;
  }
  
  /** Get an object containing the information on a section used in configs */
  function getSection(name) {
    if (builtinSections[name]!==undefined)
      return builtinSections[name];
    // not found - but we warned about this in getSections
    return {
      name : name
    };
  }
  
  /** Get an object containing information on all 'sections' used in all the configs */
  function getSections() {
    var sections = [];
    // add sections we know about
    for (var name in builtinSections)
      sections.push(builtinSections[name]);
    // add other sections
    for (var i in LUA.Core.Config.data) {
      var c = LUA.Core.Config.data[i];
      
      var found = false;
      for (var s in sections)
        if (sections[s].name == c.section)
          found = true;
      
      if (!found) {
        console.warn("Section named "+c.section+" was not added with Config.addSection");
        sections[c.section] = {
            name : c.section,
            sortOrder : 0
        };        
      }
    }
    // Now sort by sortOrder
    sections.sort(function (a,b) { return a.sortOrder - b.sortOrder; });
    
    return sections;
  }
  
  LUA.Config = {};
  LUA.Config.set = function (key, value) {
    if (LUA.Config[key] != value) {
      LUA.Config[key] = value;
      // Do the callback
      if (LUA.Core.Config.data[key] !== undefined &&
          LUA.Core.Config.data[key].onChange !== undefined)
        LUA.Core.Config.data[key].onChange(value);
      // Save to synchronized storage...
      var data = {};
      for (var key in LUA.Config)
        if (key != "set")
          data[key] = LUA.Config[key];      
      _set(data); 
    }
  };
   
  function clearAll() { // clear all settings
    _set({});
    for (var name in LUA.Core.Config.data) {
      var options = LUA.Core.Config.data[name];
      LUA.Config[name] = options.defaultValue;
    }
  }
  
  LUA.Core.Config = {
      loadConfiguration : loadConfiguration, // special - called before init 
      
      init : init,
      add : add,
      data : {},
            
      addSection : addSection,
      getSection : getSection,
      getSections : getSections,
      
      clearAll : clearAll, // clear all settings
  };
  
})();
