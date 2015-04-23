/**
 Copyright 2014,2015 Juergen Marsch (juergenmarsch@googlemail.com)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  Testing Plugin
 ------------------------------------------------------------------
**/
"use strict";
( function(){
  var p // for temp prototype
    , icon
    , datapoints = []
    , actionpoints = []
    , scriptedObjects = {}
    , imageUrl = ""
    , testingFile = ""
    , scaleMode = "both"
    , testMode = "Form" // Form | Image
    , overlay
    , frequency = 1
    , testDescription = ""
    , testProject = ""
    , intervalName = "getExpressionsPoll"
    , polling = false
    , watching = false
    , singleShot = false
    , activePoll = true
    , pollPnt
    , testDebug = true
    , testLogging = false
    , testLoggingName = ""
    , flotData = []
    , flotChart
    , flotOptions = {legend:{noColumns:5,container:"#flotlegendholder"},grid:{hoverable:true},
        xaxis:{mode:"time",ticks:5},yaxes:[{},{min:0,max:1.05,show:false}]
      }
    , flotDatasetOptions = {lines:{ show:true},clickable:false,hoverable:false}
    , flotDatasetOptionsText = {points:{ show:true},yaxis:2,clickable:false,hoverable:true}
    ;
  
  // ========== Action ==========          
  function Actionpoint(newValue) { // constructor / state
    var i,cmd = "";
    for(i in newValue){this[i] = newValue[i];}
    this.type = (this.type === "text") ?"string" : this.type;
  };  
  addAPbehavior(); function addAPbehavior(){// Action behavior
    var p = Actionpoint.prototype;
    p.getValueField = function(label) { return $("input[label='" + label + "']")[0];}
    p.setLocation = function(x,y) {this.x = x;this.y = y;};
    p.update = function(expression,type) { 
      this.expression = expression; 
      this.type = type;
    };
    p.assign = function() {
      var cmd = "";
      switch(this.type){
        case "number":
          cmd = this.expression + '=' + this.getValueField(this.label).value + ';';
          break;
        case "boolean":
          cmd = this.expression + '=' + this.getValueField(this.label).checked + ';';
          break;
        case "string":
          cmd = this.expression + '="' + this.getValueField(this.label).value + '";';
          break;
        case "command":
          cmd = this.expression + ';';
          break;
      }
      if (LUA.Core.Serial.isConnected()) {
        LUA.Core.Serial.write('\n' + cmd + '\n');
      } else {
        notification("E","nc");
      }
    };
    p.getHtmlEdit = function(i) {
	  var html = "";
	  html = "<tr>";
	  html += '<th class="alterActionPoint" title="' + this.expression + '\n' + this.type + '">' + this.label + '</th>';
	  html += '<th>';
	  switch(this.type){
	    case "number":
	      html += '<input type="text" class="testing_input" label="' + this.label + '" size="10">';
		  break;
	    case "boolean":
		  html += '<input type="checkbox" class="testing_input" label"' + this.label + '">';
		  break;
	    case "string":
		  html += '<input type="text" class="testing_input" label="' + this.label + '" size="30">';
		  break;
	    case "command":
		  break;
	  }
	  html += '<button i="' + i + '" class="executeActionPoint"></th>';
	  html += '<th><button class="dropActionPoint" i="' + i.toString() + '">Drop</button></th>';
	  html += '</tr>';
	  return html;
    };
    p.getSetxyHtml = function(i) {
      var html = "";
      html += '<tr><th class="ap_class" pnt="' + i + '">Assign</th>';
      html += '<td colspan="2" title="' + this.expression + '">' + this.label + '</td></tr>';      
      return html;
    };
  }

  // ========== Datapoint ==========  
  function Datapoint(newValue) { // constructor / state
    var i;
    for(i in newValue){this[i] = newValue[i];}
    this.type = (this.type === "text") ? "string" : this.type;
    this.points = [];
  }
  addDPbehavior(); function addDPbehavior(){// Datapoint behavior
    var p = Datapoint.prototype;
    p.setLocation = function(x,y,display){this.x = x; this.y = y; this.display = display;};
    p.update = function(expression,type){
      if(typeof expression === "object"){for(var i in expression){this[i] = expression[i];} }
      else{this.expression = expression; this.type = type;}
    };
    p.addValue = function(Value){
      if(this.points.length>99){ this.points.shift(); }
      this.points.push(Value);
    };
    p.reset = function(){ this.points = []; };
    p.getHtmlEdit = function(i){
      var html = "";
      html += '<tr>';
      html += '<td class="alterDataPoint" title="' + this.expression + '\n' + this.type + '">' + this.label + '</td>';
      html += '<th><button class="dropDataPoint" i="' + i.toString() + '">Drop</button></th>';
      html += '<tr>';   
      return html;
    };
    p.getSetxyHtml = function(i){
      var j,dpHtml,html = "";
      dpHtml = '<select id="DPid_"><option value="none">none';
      for(j in scriptedObjects){
        dpHtml += '<option value="' + j + '">' + scriptedObjects[j].description;
      }
      dpHtml += '</select>';
      html += '<tr><th class="dp_class" pnt="' + i + '" title="' + this.x + ',' + this.y + '"><u>Assign</u></th>';
      html += '<td title="' + this.expression + '">' + this.label  + '</td>';
      html += '<td>'+ dpHtml.replace(/DPid_/,"DPid_" + i) + '</td></tr>';      
      return html;
    };
  }
  
  function imageOverlay(id){
    var canvas,c,octx,scaleX,scaleY,p,me = this;
    var dbg_code = "",dbg_option = {},dbg_steps = []
    canvas = $(id);
    c = canvas[0];
    p = $(c).parent();
    c.width = p.width();
    c.height = p.height();
    octx = c.getContext('2d');
    scaleX = p.width() / 1000;
    scaleY = p.height() / 1000;
    function calcX(x){ 
      var nv;
      switch(scaleMode){
        case "both": nv = x * scaleX;break;
        case "none": nv = x;break;
        case "width": nv = x * scaleX;break;
        case "height": nv = x;break;
      }
      return nv;
    }
    function calcY(y){
      var nv;
      switch(scaleMode){
        case "both": nv = y * scaleY;break;
        case "none": nv = y;break;
        case "width": nv = y;break;
        case "height": nv = y * scaleY;break;
      }
      return nv;
    }
    function action(x,y){
      var d,i,a;
      for(i = 0; i < actionpoints.length;i++){
        a = actionpoints[i];
        if(a.x !== 0){
          d = Math.sqrt((a.x-x)*(a.x-x) + (a.y-y)*(a.y-y));
          if(d<20){
            a.assign();
          }
        }
      }    
    }
    this.drawPoints = function(dt){
      var d,v,opt,i,j;
      overlay.clear();
      for(i in dt){
        v = dt[i];
        for(j = 0; j < datapoints.length; j++){
          d = datapoints[j]; 
          if(d.label === i){
            switch(d.display){
              case "A":this.drawAlarm(d,v,scriptedObjects[d.display].options); break;
              case "W":this.drawAlarm(d,v,scriptedObjects[d.display].options);break;
              case "S":this.drawAlarm(d,v,scriptedObjects[d.display].options);break;
              case "B":this.drawBar(d,v,scriptedObjects[d.display].options);break;
              case "N":this.drawText(d,parseFloat(v,2),scriptedObjects[d.display].options);break;
              case "T":this.drawText(d,v,scriptedObjects[d.display].options);break;
              case "SW":this.reload(v + '.json');break;
              case "SP":this.speak(v);break;
              case "G":this.drawGauge(d,v,scriptedObjects[d.display].options);break;
              case "Script":this.drawScript(d,v,scriptedObjects[d.script]);break;
            }
          }
        }
      }
      if(LUA.Config.ENABLE_TestingDebug){openDebugPopup();}
    }
    this.drawAnchors = function(){
      var i;
      this.clear();
      for(var i = 0; i < datapoints.length; i++){this.drawAnchor(datapoints[i],"#FF00FF");}
      for(var i = 0; i < actionpoints.length; i++){this.drawAnchor(actionpoints[i],"#008080");}
    };
    this.drawAnchor = function(p,c){
      if(p.display){
        var x = calcX(p.x),y = calcY(p.y);
        canvas.drawLine({strokeStyle:"#EFEFEF", strokeWidth:3, x1:x, y1:y - 6, x2:x + 6, y2:y, x3:x, y3:y + 6, x4:x - 6, y4:y, closed:true });
        canvas.drawLine({strokeStyle:c, strokeWidth:1, x1:x, y1:y - 6, x2:x + 6, y2:y, x3:x, y3:y + 6, x4:x - 6, y4:y, closed:true });
      }
    }
    this.speak = function(t){ if(t !== "") LUA.Plugins.Notification_Sound.speak(t);};
    this.clear = function(){ canvas.clearCanvas();};
    this.drawAlarm = function(d,v,opt){
      var s;
      if(v > 0){
        s = {fillStyle:opt.color,x:calcX(d.x),y:calcY(d.y),width:opt.width,height:opt.height};
        $.extend(s,(typeof(d.style) === "undefined")?{}:d.style);
        s.fillStyle = (typeof(s.color) === "undefined")?c:s.color;
      }
      else{
        s = {strokeStyle:opt.color,strokeWidth:1,x:calcX(d.x),y:calcY(d.y),width:opt.width,height:opt.height};
        $.extend(s,(typeof(d.style) === "undefined")?{}:d.style);
        s.strokeStyle = (typeof(s.color) === "undefined")?c:s.color;
      }
      s.width = calcX(s.width); s.height = calcY(s.height);
      canvas.drawEllipse(s);
    };
    this.drawBar = function(d,v,opt){
      var s = $.extend({},opt,{strokeStyle:"#000",fromCenter:false,x:calcX(d.x), y: calcY(d.y)});
      $.extend(s,(typeof(d.style)  === "undefined")?{}:d.style);
      s.width = calcX(s.width);s.height = -calcX(s.height);
      canvas.drawRect(s);
      s = {fillStyle:opt.color,fromCenter: false, x: calcX(d.x), y: calcY(d.y),width: opt.width,height: opt.height};
      $.extend(s,(typeof(d.style)  === "undefined")?{}:d.style);
      s.width = calcX(s.width);s.height = -calcX(v / 100 * s.height);
      canvas.drawRect(s);
    };
    this.drawText = function(d,t,opt){
      var s = $.extend({},opt,{x:calcX(d.x),y:calcY(d.y),text:t});
      $.extend(s,(typeof(d.style)  === "undefined")?{}:d.style);
      canvas.drawText(s);
    };
    this.drawGauge = function(d,v,opt){
      var s = $.extend({},opt,{x:calcX(d.x),y:calcY(d.y)});
      $.extend(s,(typeof(d.style)  === "undefined")?{}:d.style);
      s.width = calcX(s.width); s.height = calcY(s.height);
      var aStep = Math.PI /180,
          ePX = s.x + (s.width / 2 * 0.8 * Math.cos(calcAngle(calcTargetA(v)))),
          ePY = s.y + (s.height / 2 * 0.6 * Math.sin(calcAngle(calcTargetA(v))));
      function calcTargetA(v){ return -s.angle/2 + s.angle/100 * v;}
      function calcAngle(a){ return (a + 270) * aStep; }
      canvas.drawEllipse({
        strokeStyle:s.strokeCase,strokeWidth:1,
        x:s.x,y:s.y,width:s.width,height:s.height
      }).drawArc({
        strokeStyle:s.strokeBackground,strokeWidth:9,
        x:s.x,y:s.y,radius:s.width / 2 * 0.8,
        start:-s.angle/2,end:s.angle/2        
      }).drawArc({
        strokeStyle:s.strokeValue,strokeWidth:4,
        x:s.x,y:s.y,radius:s.width / 2 * 0.8,
        start:-s.angle/2,end:-s.angle/2 + v/100*s.angle
      }).drawEllipse({
        strokeStyle:s.strokePointer,strokeWidth:1,
        x:s.x,y:s.y,width:s.width / 20,height:s.height / 20     
      }).drawLine({
        strokeStyle:s.strokePointer,strokeWidth: 2,
        rounded: true,endArrow: true,arrowRadius: 5,arrowAngle: 60,
        x1:s.x,y1:s.y,x2:ePX,y2:ePY    
      });
    };
    this.drawScript = function(d,v,opt){
      var calc,scripts,i,j,options,params,scripted;
      var s_opt;
      dbg_code = "",dbg_option = {},dbg_steps = []
      scripted = scriptedObjects[d.script];
      params = $.extend({},scripted.params,d.params);
      params.scaleX = scaleX; params.scaleY = scaleY;
      options = $.extend({},scripted.options,d.options,calculate(d,v,params));
      if(LUA.Config.ENABLE_TestingDebug){ dbg_option = options;}
      scripts = scripted.script;
      for(i = 0; i < scripts.length; i++){
        s_opt = $.extend({},scripts[i].options,scripts[i].params);
        for(j in scripts[i].options){s_opt[j] = options[s_opt[j]];}
        for(j in scripts[i].params){
          if(typeof options[s_opt[j]] === "number") s_opt[j] = Math.floor(options[s_opt[j]]);
          else s_opt[j] = options[s_opt[j]];
        }
        if(typeof scripts[i].condition == "undefined"){scriptRepeat(scripts[i],s_opt,options);}
        else if(options[scripts[i].condition] === true){scriptRepeat(scripts[i],s_opt);}
      }
      function scriptRepeat(script,opt,options){
        var p,bv,sv,r;
        if(LUA.Config.ENABLE_TestingDebug) dbg_steps.push({command:script.command,options:JSON.stringify(opt)});
        if(typeof script.repeat == "undefined"){ canvas[script.command](opt);}
        else{
          p = script.repeat.value;
          bv = options[script.repeat.byStep];
          sv = options[script.repeat.steps];
          r = script.repeat.replace;
          for(var i = 0; i < sv;i++){
            canvas[script.command](opt);
            options[p] = options[p] + bv;
            for(var j = 0; j < script.repeat.replace.length; j++){
              opt[script.repeat.replace[j]] = options[p];
            }
          }
        }
      }
    }
    function openDebugPopup(){
      LUA.Core.App.closePopup();
      $.get("data/testing_debug.html",function(html){
        var c = "";
        html = html.replace(/\$code\$/,dbg_code);
        for(var i = 0;i < dbg_steps.length; i++){
          c += dbg_steps[i].command + "(" + dbg_steps[i].options + ")<br>";
        }
        html = html.replace(/\$canvas\$/,c);       
        LUA.Core.App.openPopup({
          position: "relative",
          title: "Script Debug",
          id: "scriptDebugTab",
          contents: html
        });
        setTimeout(function(){
          $("#interpreter_run").click(function(){
            var o = runCalculation($("#interpreter_code").val());
            $("#interpreter_result").html(o.replace(/,/g,",\n"));
          })
        },100);          
      });        
    }
    function calculate(d,v,params){
      var o,c = "x=" + d.x + " y=" + d.y + " v=" + v;
      for(var i in params) c += " " + i + "=" + params[i];
      c += " " + scriptedObjects[d.script].calculation.join(" ");
      if(LUA.Config.ENABLE_TestingDebug){ dbg_code = c;}
      o = runCalculation(c);
      return JSON.parse(o);
    }
    this.bind = function(){
      $(c).unbind().click(function(e){ console.log(e);
        var x,y;
        switch(scaleMode){
          case "none": 
            x = e.offsetX;
            y = e.offsetY;
            break;
          case "both": 
            x = parseInt(e.offsetX * 1000 / p.width(),0);
            y = parseInt(e.offsetY * 1000 / p.height(),0);
            break;
          case "width": break;
          case "height": break;
        }
        if(watching){
          action(x,y);
        }
        else{
          assignImageXYtoTestingItem(x,y);
        }
      });
    };
    this.reload = function(fileName){
      if(fileName !== testingFile){
        stopGetExpression();
        setTimeout(function(){
          newTestingFile(fileName,function(){runGetExpression();});         
        },100);
      }
    };
  }
  
  function notification(type,pnt){
    var t;
    switch(pnt){
      case "nrm": t = "Not available in running mode";break;
      case "orm": t = "Only available in running mode";break;
      case "nid": t = "Cannot switch mode, no Image defined";break;
      case "nc": t = "Not connected to board";break;
      case "nan": t = "Replaced non alphanumeric by underline";break;
      case "dpc": t = "Existing datapoint altered";break;
      case "apc": t = "existing actionpoint altered";break;
      case "nsl": t = "stop testing and restart to switch logging";break;
      default: t = "Sorry, unknown message (pnt="+pnt+")";break;
    }
    switch(type){
      case "E": LUA.Core.Notifications.error(t);break;
      case "W": LUA.Core.Notifications.warning(t);break;
      case "I": LUA.Core.Notifications.info(t);break;
      default: LUA.Core.Notifications.info(t);break;
    }
  }
  
  function replaceNonAlphaNumeric(v){
    var r = v;
    if(r.match(/\W+/g, "_")){
      notification("W","nan");
      r = r.replace(/\W+/g, "_");
    }
    return r;
  }

  function init() {
    LUA.Core.Config.addSection("Testing", {
      sortOrder:600,
      description: "Displays a graph of values over time",
    });
    LUA.Core.Config.add("ENABLE_Testing", {
      section : "Testing",
      name : "Enable Testing Plugin (BETA)",
      description : "This enables window to test application on ESP8266",
      type : "boolean",
      defaultValue : false,
      onChange: function(newValue){showIcon(newValue);}
    });
    LUA.Core.Config.add("ENABLE_TestingDebug",{
      section : "Testing",
      name : "Enable Script debug",
      description : "Enable debug mode for scripted GUI objects",
      type : "boolean",
      defaultValue : false,
      onChange: function(newValue){showDebugMode();}
    });
    LUA.addProcessor("disconnected",{processor:function(data, callback){
      if(polling){stopGetExpression();}
      callback(data);
    },module:"testing"});
    $("<div id='flottooltip'></div>").css({
      position: "absolute",display: "none",border: "1px solid #fdd",
      padding: "2px","background-color": "#fee",opacity: 0.80
    }).appendTo("body");
    showIcon(LUA.Config.ENABLE_Testing);
    $('<div id="divTesting" class="Testing" style="display:none;border:none;height:100%;width:100%;"></div>').appendTo(".editor--terminal .editor__canvas");
    loadInitial(resetForm);
    loadGuis();
    function resetForm(){ showDataPoints();showActionPoints(); }
  }
  function loadGuis(){
    $.get("data/guis/SimpleGuis.json",function(data){
      $.extend(scriptedObjects,JSON.parse(data).simpleObjects); 
      LUA.Plugins.Project.loadDir("testinggui",gotDir);
      function gotDir(dir){
        var i,fileName;
        for(i = 0; i < dir.length; i++){
          fileName = "testinggui/" + dir[0].name;
          LUA.Plugins.Project.loadFile(fileName,function(data){
            $.extend(scriptedObjects,JSON.parse(data).scriptedObjects);
          })
        }
      }
    });
  }
  
  function loadInitial(callback){
    $('<div id="divTesting" class="Testing" style="display:none;border:none;height:100%;width:100%;"></div>').appendTo(".editor--terminal .editor__canvas");
    $.get("data/testing_initial.html",function(data){
      $("#divTesting").html(data);
      setTimeout(function(){
        $("#saveTesting").button({ text:false, icons: { primary: "ui-icon-disk"} }).unbind().click(testingSaveAs);
        $("#loadTesting").button({ text:false, icons: { primary: "ui-icon-script"} }).unbind().click(loadTesting);
        $("#testingExpressionRun").button({ text:false, icons: { primary: "ui-icon-play"} }).unbind().click(runGetExpression);
        $("#testingExpressionStop").button({ text:false, icons: { primary: "ui-icon-stop"} }).unbind().click(stopGetExpression);
        $("#testingExpressionStop").button('option','disabled', true);
        $("#testingLog").unbind().click(switchLogging);
        $("#openTestingLog").button({ text:false, icons: { primary:"ui-icon-image"} }).unbind().click(openTestingLog);
        $("#tstSingleShotChkbx").unbind().click(function(){ singleShot = $(this).prop("checked"); });
        $("#testProperties").unbind().click(showTestingProperties);
        showDataChart();
        showDebugMode();
      },50);
    },"html");
    if(callback){ callback(); }        
  }

  function showDebugMode(){
    if(LUA.Config.ENABLE_TestingDebug === true){$("#tstTable")[0].bgColor = "#8f8";}
    else{$("#tstTable")[0].bgColor = "#ffd";}
  }
  
  function testingSaveAs(){
    resetAllDataPoints();
    if (polling) {
      notification("W","nrm");
    } else {
      var html 
        = '<table width="100%">'
        +   '<tr><th>Name</th></tr>'
        +   '<tr><td><input id="saveTestingName" type="text" value="'
                + testingFile.split(".")[0]
                + '" size="20" maxlength="40"></td></tr>'
        +   '<tr><td><button class="saveTestingBtn">Save</button></td></tr>'
        + '</table>'
        ;
      LUA.Core.App.openPopup({
        position: "relative",
        title: "Save Testing as",
        id: "savetestingTab",
        contents: html
      });
      setTimeout(function(){
        $(".saveTestingBtn").button({ text:true, icons: { primary: "ui-icon-disk"} }).click(testingSaveAsDo);       
      },10);
    }
  } // /testingSaveAs
  
  function testingSaveAsDo() {
    var fileName = $("#saveTestingName").val();
    $("#testingName").html("(<i><b>" + fileName + "</b></i>)");
    var dt = {
      imageUrl:imageUrl,testMode:testMode,frequency:frequency,activePoll:activePoll,
      testDescription:testDescription,testProject:testProject,
      debug:testDebug,dataPoints:datapoints,actionPoints:actionpoints,scaleMode:scaleMode };
    LUA.Plugins.Project.saveFile("testing/" + fileName + ".json",JSON.stringify(dt,null,2));
    LUA.Core.App.closePopup();      
  } // /testingSaveAsDo
  
  function loadTesting() {
    if (polling) {
      notification("W","nrm");
    } else {
      var header = '<table width="100%">';
      // uses loadDirHtml() aka getProjectTable() from projects.js - in a nutshell:
      // in list row template $name0 (display, without extension, $fileentry,  
      // and $name are replaced for each *.json ext file found in directory.
      var row
        = '<tr"><th class="loadTestingEntry" title="load testing file" fileentry="$fileentry" filename="$name">'
        +     '<button class="loadTestingBtn"></button><span class="cursor:pointer; cursor:hand;"> $name0</span>'
        + '</th></tr>'
        ;
      var footer = '</table>';
      // loadDirHtml|getProjectTable(html,subDir,ext,header,row,footer,callback){...
      LUA.Plugins.Project.loadDirHtml("","testing","JSON",header,row,footer,function(html){
        LUA.Core.App.openPopup({
              position: "relative",
              title: "Load Testing",
              id: "loadtestingTab",
              contents: html
        });
        setTimeout(function(){
          $(".loadTestingBtn").button({ text:false, icons: { primary: "ui-icon-script"} });
          $(".loadTestingEntry").css({"cursor":"pointer"}).click(loadTestingFile);
        },10);
      });
    }
  }
  
  function loadTestingFile() {
    var fileName = $(this).attr("filename");
    newTestingFile(fileName,loadProject);
    LUA.Core.App.closePopup();
  }
  
  function loadProject() {
    if(testProject !== ""){
      LUA.Plugins.Project.loadFile("projects/" + testProject + ".js",function(data){
        LUA.Core.EditorJavaScript.setCode(data);
      });            
    }
  }
  
  function newTestingFile(fileName,callback){
    LUA.Plugins.Project.loadFile("testing/" + fileName,function(data){
      var i,dt = JSON.parse(data);
      datapoints = [];
      for(i = 0; i < dt.dataPoints.length; i++){ datapoints.push(new Datapoint(dt.dataPoints[i]));}
      actionpoints = [];
      for(i = 0; i < dt.actionPoints.length; i++){ actionpoints.push(new Actionpoint(dt.actionPoints[i]));}
      $("#testingName").html("(<i><b>" + fileName.split(".")[0] + "</b></i>)");
      if(typeof dt.imageUrl === "undefined") imageUrl = ""; else imageUrl = dt.imageUrl;
      if(typeof dt.frequency === "undefined") frequency = 1; else frequency = dt.frequency;
      if(typeof dt.activePoll === "undefined") activePoll = false; else activePoll = dt.activePoll;
      if(typeof dt.testMode ==="undefined") testMode = "Form"; else testMode = dt.testMode;
      if(typeof dt.Debug === "undefined") testDebug = true; else testDebug = dt.debug;
      if(typeof dt.testDescription === "undefined") testDescription = ""; else testDescription = dt.testDescription;
      if(typeof dt.testProject === "undefined") testProject = ""; else testProject = dt.testProject;
      if(typeof dt.scaleMode === "undefined") scaleMode = "both"; else scaleMode = dt.scaleMode;
      $("#testMode").val(testMode);
      testingFile = fileName;
      showTesting();
      if(callback) {callback();}        
    });    
  }
  
  function showTesting(){
    switch(testMode){
      case "Image": showDataImage(imageUrl); break;
      case "Form": showDataChart(); break;
    }    
  }
  
  function showTestingProperties() {
    // #muet! needs styling - in general, need testing.css for styling in general
    var html = "";
    html +=     '<table id="testingPropertiesTab" width="100%" border="0" cellspacing="0" cellpadding="3">';
    html +=       '<tr><th width="25%">Description</th>';
    html +=         '<th width="75%"><textarea id="testDescription"';
    html +=           ' cols="35" rows="3"></textarea></th></tr>';
    html +=       '<tr><th title="optional .jpg file in testing folder">Image .jpg</th><th id="imageUrl">';
    html += LUA.Plugins.Project.loadDirHtml(html,"testing","JPG",
                      '<select id="imageUrlList"><option>- none -</option>',
                      '<option>$name',
                      '</select>',
                    function(html){
      html +=       '</th></tr>';
      html +=     '<tr><th>Interval (secs)</th><th><input type="text" size="5" id="testingFrequency"></th></tr>';
      html +=     '<tr><th>Active Poll</th><th><input type="checkbox" id="testPollActive"></th></tr>';
      html +=     '<tr><th title="optional .js file in projects folder">Project .js</th><th id="projectUrl">';
      html += LUA.Plugins.Project.loadDirHtml(html,"projects","JS",
                      '<select id="projectUrlList"><option>- none -</option>',
                      '<option>$name',
                      '</select>',
                    function(html){
        html +=     '</th></tr>';
        html +=     '<tr><th>Debug mode</th><th><input type="checkbox" id="testDebug"></th></tr>';
        if (!polling) { 
          html +=   '<tr><th colspan="2" style="border-top:1px #CFCFCF solid;"><button id="hideAndStoreTestingPropertiesBtn">OK</button></th></tr>';
        }
        html += '</table>';
        LUA.Core.App.openPopup({
          position: "relative",
          title: "Testing Properties" + ((polling) ? " (view only)" : ""),
          id: "testingPropertiesList",contents: html
        });
        setTimeout(function(){
          $("#testDescription").val(testDescription);
          $("#imageUrlList").val((imageUrl == "") ? "- none -" : imageUrl);
          $("#testingFrequency").val(frequency);
          $("#testPollActive")[0].checked = activePoll;
          $("#projectUrlList").val((testProject == "") ? "- none -" : testProject + ".js");
          $("#testDebug")[0].checked = testDebug;
          if (!polling) { $("#hideAndStoreTestingPropertiesBtn").unbind().click(hideAndStoreTestingProperties); }
        },100);
      }); // /loadDirHTML callback for .js for project
    }); // /loadDirHTML callback for .jpg for image
  }
  
  function hideAndStoreTestingProperties(){
    var val;
    testDescription = $("#testDescription").val();
    imageUrl = ((val = $("#imageUrlList").val()) == '- none -') ? "" : val;
    frequency = $("#testingFrequency").val();
    activePoll = $("#testPollActive")[0].checked;
    testProject = ((val = $("#projectUrlList").val()) == '- none -') ? "" : val.split(".")[0];
    testDebug = $("#testDebug")[0].checked;
    LUA.Core.App.closePopup();  
  }
  
  function switchLogging(){
    if(polling){notification("W","nsl");this.checked = testLogging;}
    else{testLogging = this.checked;}
  }

  function openTestingLog(){
    var url = "data/app/openTestingLog.html?entry=" + LUA.Config.projectEntry.split(":")[0];
    url += "&directory=" + LUA.Config.projectEntry.split(":")[1];
    chrome.app.window.create(url, {innerBounds: {width: 620,height: 430}}); 
  }

  function showActionPoints(){
    var i,html = "";
    html += '<table boder="1" id="actionTable">';
    for(i = 0; i < actionpoints.length; i++){
      html += actionpoints[i].getHtmlEdit(i);
    }
    html += '</table>';
    $("#testingAction").html(html);
    $(".alterActionPoint").click(copyAP2input);
    $(".dropActionPoint").button({ text:false, icons:{ primary: "ui-icon-minus"}}).unbind().click(dropActionPoint);
    $(".executeActionPoint").button({ text:false, icons: { primary: "ui-icon-play"} }).unbind().click(runActionPoint);
    $("#testingSetClear").button({ text:false, icons:{primary:"ui-icon-minusthick"}}).unbind().click(dropAllAction);
    $("#testingAddAction").button({ text:false, icons: { primary: "ui-icon-circle-plus"} }).unbind().click(addActionPoint);
  }
  
  function dropAllAction(){
    if(!polling){
      actionpoints = [];
      $("#testingAction").html("");
    }
    else {notification("W","nrm");}
  }
  
  function dropActionPoint(){
    if(!polling){
      actionpoints.splice($(this).attr("i"),1);
      showActionPoints();
    }
    else {notification("E","nrm");}
  }
  
  function runActionPoint(){
    // if (polling) { #jj? why restrict - #muet?
      actionpoints[$(this).attr("i")].assign();
    // } else {
    //  notification("W","orm");
    // }
  }
  
  function addActionPoint(){
    var i,label = replaceNonAlphaNumeric($("#actionName").val());
    if(!polling){
      i = actionPointExists(label);
      if(i){ notification("I","apc");actionpoints[i].update($("#actionExpression").val(),$("#actionType").val());}
      else{ actionpoints.push(new Actionpoint({label:label,expression:$("#actionExpression").val(),type:$("#actionType").val()}));}
      
      showActionPoints();
    }
    else {notification("W","nrm");}
  }
  
  function actionPointExists(label){
    var i;
    for(i = 0; i < actionpoints.length; i++){
      if(actionpoints[i].label === label) return i;
    }
    return false;
  }
  
  function copyAP2input(){
    var t = $(this)[0];
    $("#actionName").val(t.innerText);
    $("#actionExpression").val(t.title.split("\n")[0]);
    $("#actionType").val(t.title.split("\n")[1]);    
  }

  function showDataPoints(){
    var i,html = "",ds;
    html += '<table border="1" id="detailsTable">';
    if(datapoints.length === 0){
      datapoints.push(new Datapoint({label:"Time",expression:"tmr.now()",type:"number"}));
      datapoints.push(new Datapoint({label:"FreeMemory",expression:"collectgarbage(\"count\")",type:"number"}));
    }
    for(i = 0;i < datapoints.length; i++){html += datapoints[i].getHtmlEdit(i);}
    html += '</table>';
    $("#testingTable").html(html);
    $(".alterDataPoint").click(copyDP2input);
    $(".dropDataPoint").button({ text:false, icons:{primary: "ui-icon-minus"}}).unbind().click(dropDataPoint);
    $("#testingExpressionClear").button({ text:false, icons:{primary:"ui-icon-minusthick"}}).unbind().click(dropAllDataPoints);
    $("#testingExpressionReset").button({ text:false, icons:{primary:"ui-icon-seek-first"}}).unbind().click(resetAllDataPoints);
    $("#testingAdd").button({ text:false, icons: { primary: "ui-icon-circle-plus"} }).unbind().click(addDataPoint);
  }
  
  function dropDataPoint(){
    if(!polling){
      datapoints.splice($(this).attr("i"),1);
      showDataPoints();
    }
    else{notification("W","nrm")}
  }
  
  function dropAllDataPoints(){
    if(!polling){
      datapoints = [];
      showDataPoints();
    }
    else{notification("W","nrm")}
  }
  
  function resetAllDataPoints(){
    if(!polling){
      for(var i = 0; i < datapoints.length; i++){
        datapoints[i].reset();
      }
      showFlotCharts();
    }
    else{notification("W","nrm")}
  }
  
  function addDataPoint(){
    var i,label = replaceNonAlphaNumeric($("#testingLabel").val());
    if(!polling){
      i = dataPointExists(label);
      if(i){ notification("I","dpc");datapoints[i].update($("#testingExpression").val(),$("#testingType").val()); }
      else { datapoints.push(new Datapoint({label:label,expression:$("#testingExpression").val(),type:$("#testingType").val()}));}
      showDataPoints();
    }
    else{notification("W","nrm")}
  }
  function storeDatapoint(label,options){
    i = dataPointExists(label);
    datapoints[i].update(options);
    showDataPoints();
  }
  
  function dataPointExists(label){
    var i;
    for(i = 0; i < datapoints.length; i++){
      if(datapoints[i].label === label) return i;
    }
    return false;
  }
  
  function copyDP2input(){
    var t = $(this)[0],label = t.innerText,dp = datapoints[dataPointExists(label)];
    var html = '<table>';
    html += '<tr><th>' + label + '</th>';
    html += '<th><input type="text" id="tstPopupExpr" size="30"></th></tr>';
    html += '<tr><th colspan="2"><button id="savePopupExpr">Save</button></th></tr>';
    html += '</table>';
    LUA.Core.App.openPopup({
      position: "relative",title: "Edit datapoint",id: "dpEdit",contents: html
    });
    setTimeout(function(){
      $("#tstPopupExpr").val(dp.expression);
      $("#savePopupExpr").unbind().click(saveDPEdit);
    },50);
    function saveDPEdit(){
      dp.expression = $("#tstPopupExpr").val();
      showDataPoints();
      LUA.Core.App.closePopup();
    }
  }
  
  function showDataImage(url){
    var el,t,h,w,divFile;
    t = $("#testingForm");
    t.html("");
    switch(scaleMode){
      case "both": divFile = "data/testing_image.html";break;
      case "none": divFile = "data/testing_imageNone.html";break;
      case "width": divFile = "data/testing_imageWidth.html";break;
      case "height": divFile = "data/testing_imageHeight.html";break;
    }
    $.get(divFile,function(data){
      t.html(data);    
      setTimeout(function(){
        h = t[0].clientHeight;w = t[0].clientWidth;
        $("#divImage2").css({"height":h + "px","width":w + "px"});
        LUA.Plugins.Project.loadDataUrl("testing/" + url,showImage);
      },50);
    },"html");
    function showImage(dataUrl){
      var c,img;
      img = $("#testingImage")[0];
      img.src = dataUrl;
      overlay = new imageOverlay('#overlayCanvas');
      overlay.clear();
      overlay.bind();
      overlay.drawAnchors();
    }
  }
  
  function showDataChart(){
    $.get("data/testing_form.html",function(data){
      $("#testingForm").html(data);
      showDataPoints();
      showActionPoints();
      showFlotCharts();
      $("#testMode").unbind().change(function(){
        switch($("#testMode").val()){
          case "Image":
            if(imageUrl !== "" && imageUrl !== null){testMode = "Image";showTesting();}
            else{
              notification("W","nid");
              $("#testMode").val(testMode);                          
            }
            break;
          case "Form":
            testMode = "Form";
            showTesting();
            break;
        }
      });    
    },"html");
  }
  
  function assignImageXYtoTestingItem(x,y){
    var p = checkForDataPoint(x,y);
    if(p === false){
      p = checkForActionPoint(x,y);
      if(p === false) {assignImageXYNew(x,y);}
      else{assignImageXYEditAP(p);}
    }
    else{assignImageXYEditDP(p);}
  }
  function assignImageXYNew(x,y){
    var html,i;
    html = "Please assign click to datapoint or action";
    html += '<table width="100%" border="1"><tr><th colspan="3" align="center">Datapoints</th></tr>';
    for(i = 0; i < datapoints.length;i++){ html += datapoints[i].getSetxyHtml(i); }
    html += '<tr><th colspan="3" align="center">Actions</th></tr>';
    for(i = 0; i < actionpoints.length;i++){ 
      if(actionpoints[i].type === "command") html += actionpoints[i].getSetxyHtml(i);
    }
    html += '</table>';
    LUA.Core.App.openPopup({
      position: "relative",title: "Assign to Item",id: "pointList",contents: html
    });
    setTimeout(function(){
      var i;
      for(i = 0; i < datapoints.length;i++){
        if(datapoints[i].display){$("#DPid_" + i).val(datapoints[i].display);}
        else{$("#DPid_" + i).val("none");}
      }
      $(".dp_class").unbind().click(function(){
        i = parseInt($(this).attr("pnt"));
        datapoints[i]["x"] = x;
        datapoints[i]["y"] = y;
        datapoints[i]["display"] = $("#DPid_" + i).val();
        LUA.Core.App.closePopup();
        overlay.drawAnchors();
      });
      $(".ap_class").unbind().click(function(){
        i = parseInt($(this).attr("pnt"));      
        actionpoints[i]["x"] = x;
        actionpoints[i]["y"] = y;
        actionpoints[i]["display"] = true;
        LUA.Core.App.closePopup();
        overlay.drawAnchors();
      });
    },50);      
  }
  function assignImageXYEditAP(ap){
    var html = "";
    html = "<table>";
    html += "<tr><th>Label</th><th>" + ap.label + "</th></tr>";
    html += "<tr><th>Type</th><th>" + ap.type + "</th></tr>";
    html += "<tr><th>Expression</th><th>" + ap.expression + "</th></tr>";
    html += '<tr><th align="left"><button id="tstSaveAP">Save</button></th>';
    html += '<th align="right"><button id="tstDropAP">Drop</button></th></tr>';    
    html += "</table>";
    LUA.Core.App.openPopup({position: "relative",title: "Edit ActionPoint",id: "apEdit",contents: html});
    setTimeout(function(){
      $("#tstSaveAP").button({ text:false, icons: { primary: "ui-icon-disk"} }).unbind().click(saveImageAP);
      $("#tstDropAP").button({ text:false, icons: { primary: "ui-icon-trash"} }).unbind().click(dropImageAP);      
    },50);
    function dropImageAP(){
      delete ap.display; delete ap.x; delete ap.y;
      LUA.Core.App.closePopup();
      overlay.drawAnchors();
    }
    function saveImageAP(){
      LUA.Core.App.closePopup();
      overlay.drawAnchors();
    }
  }
  function assignImageXYEditDP(dp){
    var html = "",opts,i;
    if(dp.display === "Script"){ opts = scriptedObjects[dp.script]} else { opts = scriptedObjects[dp.display]}
    opts.options = $.extend(opts.options,dp.options);
    html = "<table>";
    html += "<tr><th>Label</th><th>" + dp.label + "</th></tr>";
    html += "<tr><th>Expression</th><th>" + dp.expression + "</th></tr>";
    html += "<tr><th>Type</th><th>" + opts.description + "<th></tr>";
    for(i in opts.options){
      html += "<tr><th>" + i + "</th><th>";
      html += '<input typeof="' + typeof opts.options[i] + '" type="text" id="tst' + i + '" value="' + opts.options[i] + '">';
      html += "</th></tr>";
    }
    html += '<tr><th align="left"><button id="tstSaveDP">Save</button></th>';
    html += '<th align="right"><button id="tstDropDP">Drop</button></th></tr>';
    html += "</table>";
    LUA.Core.App.openPopup({position: "relative",title: "Edit datapoint",id: "dpEdit",contents: html}); 
    setTimeout(function(){
      $("#tstSaveDP").button({ text:false, icons: { primary: "ui-icon-disk"} }).unbind().click(saveImageDP);
      $("#tstDropDP").button({ text:false, icons: { primary: "ui-icon-trash"} }).unbind().click(dropImageDP);
    },50);
    function dropImageDP(){
      delete dp.display; delete dp.x; delete dp.y;
      LUA.Core.App.closePopup();
      overlay.drawAnchors();
    }
    function saveImageDP(){
      var x;
      for(i in opts.options){
        x = $("#tst" + i);
        switch(x.attr("typeof")){
          case "string": dp.options[i] = x.val(); break;
          case "number": dp.options[i] = parseFloat(x.val()); break;
          case "boolean": dp.options[i] = x.val() == 'true'; break;
        }
      }
      LUA.Core.App.closePopup();
      overlay.drawAnchors();
    }
  }
  function checkForDataPoint(x,y){
    var d,dp;
    for(var i = 0; i < datapoints.length; i++){
      dp = datapoints[i];
      d = Math.sqrt((dp.x-x) * (dp.x-x) + (dp.y-y) * (dp.y-y));
      if(d < 10) { return dp;}
    }
    return false;
  }
  function checkForActionPoint(x,y){
    var d,ap;
    for(var i = 0; i < actionpoints.length; i++){
      ap = actionpoints[i];
      d = Math.sqrt((ap.x-x) * (ap.x-x) + (ap.y-y) * (ap.y-y));
      if(d < 10) {return ap;}
    }
    return false;
  }
  function imageAction(x,y){
    var d,i,a;
    for(i = 0; i < actionpoints.length;i++){
      a = actionpoints[i];
      if(a.x !== 0){
        d = Math.sqrt((a.x-x)*(a.x-x) + (a.y-y)*(a.y-y));
        if(d<10){
          a.assign();
        }
      }
    }    
  }

  function runGetExpression(){
    var s,d = new Date();
    if(LUA.Core.Serial.isConnected()){
      $("#testingExpressionStop").button( "option", "disabled", false);
      $("#testingExpressionRun").button( "option", "disabled", true);
      if(LUA.Config.ENABLE_TestingDebug === true){
        singleShot = true;
        $("#tstSingleShotChkbx")[0].checked = true;
      }
      if(activePoll){ pollData(); }
      polling = true;
      watchingProcessor(true);      
      if(testLogging === true){
        testLoggingName = "testinglog/" + testingFile.split(".")[0] + "_" + d.getFullYear() + "_" + d.getMonth() + "_" + d.getDate();
        testLoggingName += "_" + d.getHours() + "_" + d.getMinutes() + "_" + d.getSeconds() + ".json";
        s = '[{"UTC":' + d.getTime() + ',"testing":"' + testingFile.split(".")[0] + '","dataPoints":[';
        for(var i = 0; i < datapoints.length; i++){
          if(i > 0) s += ',';
          s += '{"label":"' + datapoints[i].label + '","type":"' + datapoints[i].type + '"}';
        }
        s += ']}\n]';
        LUA.Plugins.Project.appendFile(testLoggingName,s);
      }
    }
    else{notification("E","nc");}    
  }
  function watchingProcessor(status){
    watching = status;
    if(status === true){
      LUA.removeProcessorsByType("getWatched");
      LUA.addProcessor("getWatched", { "processor":function (data, callback) {
        if(LUA.Config.ENABLE_Testing){ if(polling){setTestingValues(data);}}
        callback(data);
      },"module":"testing"});
    }
    else{
      overlay.drawAnchors();
      LUA.removeProcessor("testing","getWatched");
    }
  }  
  function stopGetExpression(){
    if(activePoll){ clearInterval(pollPnt)};
    $("#testingExpressionStop").button( "option", "disabled", true);
    $("#testingExpressionRun").button( "option", "disabled", false); 
    polling = false;
    watchingProcessor(false);
  }
  
  function showFlotCharts(){
    var d,dp,lastData;
    flotData = [];
    for(var i = 0; i < datapoints.length;i++){
      d = {label:datapoints[i].label,data:[]};
      switch(datapoints[i].type){
        case "number":
          for(var j = 0; j < datapoints[i].points.length; j++){
            d.data.push(datapoints[i].points[j]);
          }
          $.extend(true,d,flotDatasetOptions);
          break;
        case "string":
          lastData = "";
          for(var j = 0; j < datapoints[i].points.length; j++){
            dp = datapoints[i].points[j];
            if(dp[1] && (dp[1] != lastData)){
              d.data.push([dp[0],1,dp[1]]);
              lastData = dp[1];
            }      
          }
          $.extend(true,d,flotDatasetOptionsText);
          break;
      }
      flotData.push(d);
    }
    setTimeout(function(){
      if($("#flotplaceholder")[0]){
        flotChart = $.plot($("#flotplaceholder"),flotData,flotOptions);
        $("#flotplaceholder").unbind().on("plothover",function(event,pos,item){
          if(item){
            $("#flottooltip").html(item.series.data[item.dataIndex][2])
            .css({top: item.pageY+5, left: item.pageX+5})
            .fadeIn(200);
          } else {$("#flottooltip").hide();}
        });
      }        
    },100);
  }
  
  function setTestingValues(data){
    var i,j,dt,utc;
    if(singleShot) stopGetExpression();
    utc = new Date().getTime();
    dt = JSON.parse(data);
    if(testLogging === true){
      LUA.Plugins.Project.appendFile(testLoggingName,',{"UTC":' + utc + ',"data":' + data + "}\n]");
    }
    if(typeof dt === "object"){
      for(i in dt){
        for(j = 0; j < datapoints.length;j++){
          if(i === datapoints[j].label){       
            datapoints[j].addValue([utc,dt[i]]);
          }
        }
      }
    }
    switch(testMode){
      case "Form":showFlotCharts();break;
      case "Image":overlay.drawPoints(dt);break;
    }
  }
  
  function pollData(){
    var data = "";
    for(var i = 0; i < datapoints.length; i++){
      if(data !== "") data += ",";
      data += datapoints[i].label + "=" + datapoints[i].expression;
    }
    LUA.Core.Send.getPolling(intervalName,data,function(){
      var cmd = intervalName + "()\n";    
      LUA.Core.Serial.write(cmd,function(){
        if(pollPnt){clearInterval(pollPnt);}
        pollPnt = setInterval(function(){
          cmd = intervalName + "()\n";
          LUA.Core.Serial.write(cmd);
        },frequency * 1000);                      
      });
    });   
  }

  function showIcon(newValue){
    if(newValue){
      icon = LUA.Core.App.addIcon({
        id:'terminalTesting',
        icon: 'code',
        title: 'Switch to testing page',
        order: 600,
        area: {
          name: "terminal",
          position: "bottom"
        },
        click: openTestingWindow
      });
    }
    else{
      if (icon!==undefined) icon.remove();
    }
  }
  
  function openTestingWindow(){
    if (isInTesting()) {
      switchToCode();
      LUA.Core.EditorLUA.madeVisible();
    } 
    else { switchToTesting();}
  }
  
  function switchToTesting() {
    $("#terminal").hide();
    $("#divTesting").show();
    icon.setIcon("eye");
  }
  
  function switchToCode() {
    $("#divTesting").hide();
    $("#terminal").show();
    icon.setIcon("code");
  } 

  function isInTesting() {
    return $("#divTesting").is(":visible");
  }
  
  LUA.Plugins.Testing = {
    init : init
  };
  
}());