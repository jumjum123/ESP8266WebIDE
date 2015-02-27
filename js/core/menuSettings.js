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
  function init() {

    LUA.Core.App.addIcon({ 
      id: "settings",
      icon: "settings", 
      title : "Settings", 
      order: -100,
      area: {
        name: "toolbar",
        position: "right"
      },
      click: function() {
        createSettingsWindow();
      }
    });

  }
  
  function createSettingsWindow(initialSection) {
    if (initialSection==undefined)
      initialSection = "About";
    // Get sections
    var sections = LUA.Core.Config.getSections();
    // Write list of sections
    var html = 
      '<div class="settings">'+
        '<div class="sections">';   
    for (var i in sections)
      html += '<a name="'+sections[i].name+'" title="'+ sections[i].description +'"><div class="icon-forward sml"></div><span>'+sections[i].name+'</span></a>';
    html +=    
        '</div>'+
        '<div class="currentsection">'+
        '</div>'+
      '</div>';
    // Create the window
    LUA.Core.App.openPopup({
      title: "Settings",
      contents: html,
      position: "stretch",
    });
    // Handle section changes
    $(".settings .sections a").click(function() {
      showSettingsSection($(this).attr("name"));
    });
    // Show initial section
    showSettingsSection(initialSection);
  }
  
  function showSettingsSection(sectionName) {
    $(".settings .sections a").removeClass("current");
    getSettingsSection(sectionName, function(data) {
      $(".settings .currentsection").html(data);      
      $(".settings .sections a[name='"+sectionName+"']").addClass("current");
      $(".tour_link").click(function(e) {
        e.preventDefault();
        LUA.Core.App.closePopup();
        LUA.Plugins.Tour.runTour("/data/tours/"+$(this).attr("tour_name"));
      });
    });
  }
  
  function getSettingsSection(sectionName, callback) {
    var section = LUA.Core.Config.getSection(sectionName);
    if (section===undefined) {
      console.warn("No section named "+sectionName+" found");
      callback("");
      return;
    }
    
    var html = "<h1>"+sectionName+"</h1>";
    if (section.description!==undefined)
      html += "<p>"+LUA.Core.Utils.escapeHTML(section.description, false) +"<p>";
    if (section.tours!==undefined) {
      html += "<p>See the ";
      var tours = [];
      for (var tourName in section.tours) 
        tours.push('<a href="#" class="tour_link" tour_name="'+section.tours[tourName]+'">'+tourName+'</a>');
      
      if (tours.length==1)
        html += tours[0];
      else
        html += tours.slice(0,-1).join(", ") + " and "+tours[tours.length-1];
      html += " for more information.</p>";
    }

    var configItems = LUA.Core.Config.data;
    for (var configName in configItems) {
      var configItem = configItems[configName];
      if (configItem.section == sectionName) {
        html += getHtmlForConfigItem(configName, configItem);
      }
    }
    
    if (section.getHTML!==undefined) {
      section.getHTML(function (data) {
        callback(html + data);        
      });
    } else {
      callback(html); 
    }

   $(".settings .currentsection input,select").change(function() {
     var configName = $(this).attr("name");
     if (configItems[configName] !== undefined) {
       if (configItems[configName].type == "boolean")
         LUA.Config.set(configName, $(this).is(':checked'));
       else
         LUA.Config.set(configName, $(this).val());
       console.log("Config."+configName+" => "+LUA.Config[configName]);
     } else
       console.warn("Config named '"+configName+"' not found");
   });
    
  }
  
  function getHtmlForConfigItem(configName, config) {
    var value = LUA.Config[configName];
    var html = 
      '<h3>'+LUA.Core.Utils.escapeHTML(config.name)+'</h3>';
    var desc =
      '<p>'+LUA.Core.Utils.escapeHTML(config.description, false)+'</p>';
    // type : "int"/"boolean"/"string"/{ value1:niceName, value2:niceName },
    if (config.type == "boolean") {
      html += '<input name="'+configName+'" type="checkbox" style="float: right;" '+(value?"checked":"")+'/>';
      html += desc;
    } else if (config.type == "string") {
      html += desc;
      html += '<input name="'+configName+'" type="text" size="80" value="'+LUA.Core.Utils.escapeHTML(value)+'"/>';
    } else if ((typeof config.type) == "object") {
      html += '<select name="'+configName+'" style="float: right;">';
      for (var key in config.type)
        html += '<option value="'+LUA.Core.Utils.escapeHTML(key)+'" '+(key==value?"selected":"")+'>'+
                  LUA.Core.Utils.escapeHTML(config.type[key])+
                '</option>';
      html += '</select>';
      html += desc;
    } else
      console.warn("Unknown config type '"+config.type+"' for Config."+configName);    
      
    return html;
  }
  
  LUA.Core.MenuSettings = {
    init : init,
    
    show : createSettingsWindow,
  };
}());