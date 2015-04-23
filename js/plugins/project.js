/**
 Copyright 2014,2015 Juergen Marsch (juergenmarsch@googlemail.com)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  Local Project handling Plugin
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  var iconFolder,iconSnippet,actualProject = "";
  var snippets = JSON.parse('{ "Reset":"reset();","Memory":"process.memory();","ClearInterval":"clearInterval();"}');
  function init() {
    LUA.Core.Config.addSection("Project", {
      sortOrder:500,
      description: "Local directory used for projects, modules, etc. When you select a directory, the 'Projects' and 'Snippets' icons will appear in the main window.",
      getHTML : function(callback) { 
        var html =
                '<div id="projectFolder" style="width:100%;border:1px solid #BBB;margin-bottom:10px;"></div>'+
                '<button class="projectButton">Select Directory for Sandbox</button>';
        callback(html);
        setTimeout(function(){
          showLocalFolder();
          setSandboxButton(); // make the 'Select Directory' button do something
        },10);
      }
    });
 
    LUA.addProcessor("initialised",{processor:function(){
      if(LUA.Config.projectEntry){ 
        chrome.fileSystem.isRestorable(LUA.Config.projectEntry,function(bisRestorable){
          if(!bisRestorable){ LUA.Config.Notifications.warning("Sandbox not valid anymore");}
          else{ checkEntry(LUA.Config.projectEntry,function(theEntry){ updateProjectFolder(theEntry);});}
        });
      }
    },module:"project"});
    setTimeout(function(){
      getProjectSnippets();          
    },10);
    showIcon(LUA.Config.projectEntry);
  }
  function int2Hex(u){
    var l = u.toString(16);
    if(l.length === 1){ l = "0" +l; }
    return l;
  }
  function setSandboxButton(){
    $(".projectButton").click(function(evt){
      chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function(theEntry) {
        if(theEntry){
          chrome.fileSystem.getDisplayPath(theEntry,function(path) {            
            $("#projectEntry").val(chrome.fileSystem.retainEntry(theEntry));
            LUA.Config.set("projectEntry",chrome.fileSystem.retainEntry(theEntry));
            showLocalFolder(); // update text box + icon
            updateProjectFolder(theEntry);
          });
        } else {
          // user cancelled
          LUA.Config.set("projectEntry",""); // clear project entry
          showLocalFolder(); // update text box + icon
        }
      }); 
    });
  }
  function showLocalFolder(){
    // set whether we show the project icon or not
    showIcon(LUA.Config.projectEntry);
    // update the project folder text box
    $("#projectFolder").html("&nbsp;");
    if(LUA.Config.projectEntry){
      chrome.fileSystem.isRestorable(LUA.Config.projectEntry, function(bIsRestorable){
        chrome.fileSystem.restoreEntry(LUA.Config.projectEntry, function(theEntry) {
          if(theEntry){
            chrome.fileSystem.getDisplayPath(theEntry,function(path) { 
              $("#projectFolder").text(path);
            });
          }
          else{LUA.Core.Status.setStatus("Project not found");}
        }); 
      });
    } 
  }
  function addProcessorGetWatched(waitingFunc,maxDuration){
    LUA.removeProcessorsByType("getWatched");
    LUA.addProcessor("getWatched",{processor:function (data, callback) {
      waitingFunc(data);
      callback(data);
    },module:"project",maxDuration:maxDuration});    
  }
  function removeProcessorGetWatched(){
    LUA.removeProcessor("project","getWatched");
  }
  
  function getProjectSubDir(name,callback){
    checkEntry(LUA.Config.projectEntry,getSubTree);
    function getSubTree(entry){
      var dirReader = entry.createReader();
      dirReader.readEntries (function(results) {
        for(var i = 0; i < results.length; i++){
          if(results[i].name === name){
            callback(results[i]);
            return;
          }
        }
        console.warn("getProjectSubDir("+name+") failed");
        callback(false);
      });
    }
  }
  function checkSubFolder(entries,subDirName){
    var r = false;
    for(var i = 0; i < entries.length; i++){
      if(entries[i].isDirectory){
        if(entries[i].name === subDirName){ r = true;break;}
      }
    }
    return r;
  }      
  function checkEntry(entry,callback){
    if(entry){
      chrome.fileSystem.isRestorable(entry, function(bIsRestorable){
        chrome.fileSystem.restoreEntry(entry, function(theEntry) { 
          if(theEntry){ callback(theEntry);}
          else{LUA.Status.setError("Project not found");}
        });
      });
    }
  }
  function checkFileExists(dirEntry,fileName,existsCallback,notExistsCallback){
    if (!dirEntry) {
      if (notExistsCallback)notExistsCallback();
      return;
    }
      
    var dirReader = dirEntry.createReader();
    dirReader.readEntries(function(results){
      var fnd = false;
      for(var i = 0;i < results.length; i++){
        if(results[i].name === fileName){
          existsCallback(results[i]);
          fnd = true;
          break;
        }
      }
      if(!fnd && notExistsCallback){notExistsCallback();}
    });
  }
  function readFilefromEntry(entry,callback){
    var reader = new FileReader();
    reader.onload = function(e){ callback(e.target.result);};
    entry.file(function(file){ reader.readAsText(file);});
  }
  function readDataUrlfromEntry(entry,callback){
    var reader = new FileReader();
    reader.onloadend = function(e){callback(e.target.result);};
    entry.file(function(file){reader.readAsDataURL(file);});
  }
  function readBinaryArrayfromEntry(entry,callback){
    var reader = new FileReader();
    reader.onload = function(e){callback(e.target.result);};
    entry.file(function(file){ reader.readAsArrayBuffer(file);});
  }

  function getProjectSnippets(){
    if(LUA.Config.projectEntry){
      getProjectSubDir("snippets",function(subDirEntry){
        checkFileExists(subDirEntry,"terminalsnippets.txt",function(fileEntry){
          readFilefromEntry(fileEntry,function(data){
            snippets = JSON.parse(data);
          });
        });
      });
    }      
  }
  function getSnippets(html,callback){
    html += '<div id="s">' + getSnippetTable() + '</div>';
    callback(html);
  }
  function getSnippetTable(){
    var i,j,html = "";  
    html += '<table width="100%">';
    j = 0;
    for(i in snippets){
      html += '<tr><th>' + i + '</th><th>' + snippets[i] + '</th>';
      html += '<th title="drop snippet"><button snippet="' + i + '" class="dropSnippet"></button></th></tr>';
      j++;
    }
    html += '<tr><th><input type="text" size="10" id="newSnippetName" value="snippet' + j.toString() + '"></th><th>';
    html += '<input type="text" id="newSnippetValue" value="console.log();"></th>';
    html += '<th><button class="addSnippet">Add Snippet</button></th></tr>';
    html += '</table>';
    return html;
  }
  function dropSnippet(){
    var i,snp = {};
    var snippet = $(this).attr("snippet");
    for(i in snippets){
      if(i !== snippet){
        snp[i] = snippets[i];
      }
    }
    snippets = snp;
    $("#s").html(getSnippetTable());
    saveSnippets();
    LUA.Core.App.closePopup();
  }
  function addSnippet(){
    snippets[$("#newSnippetName").val()] = $("#newSnippetValue").val();
    $("#s").html(getSnippetTable());
    saveSnippets();
    LUA.Core.App.closePopup();
  }
  function saveSnippets(){
    if(LUA.Config.projectEntry){
      getProjectSubDir("snippets",function(subDirEntry){
        if (!subDirEntry) return;
        checkFileExists(subDirEntry,"terminalsnippets.txt",
          function(fileEntry){
            fileEntry.createWriter(function(fileWriter){
              var bb = new Blob([JSON.stringify(snippets)],{type:'text/plain'});
              fileWriter.truncate(bb.size);
              setTimeout(function(evt){
                fileWriter.seek(0);
                fileWriter.write(bb);
              },200);
            });
          },
          function(){
            setTimeout(function(){                    
              getProjectSubDir("snippets",function(dirEntry){
                if (!dirEntry) return;
                saveFileAs(dirEntry,"terminalsnippets.txt",JSON.stringify(snippets));
              });
            },50);
          }
        );
      });
    }
  }
  function sendSnippets(evt){
    var txt = snippets[$(this).html()] + "\n";
    LUA.Core.MenuPortSelector.ensureConnected(function() {
      LUA.Core.Serial.write(txt,function(){});          
    });
    LUA.Core.App.closePopup();
    $("#terminalfocus").focus();
  }

  function getProject(html,callback){
    if(LUA.Config.projectEntry){
      html += '<div id="tabs">';
      html += '<ul><li><a href="#p">Projects</a></li>';
      html += '<li><a href="#s">Snippets</a></li>';
      html += '<li><a href="#f">Files</a></li></ul>';
      getProjects(html,function(html){
        getSnippets(html,function(html){
          getLUAFiles(html,function(html){
            html += '</div>';
            callback(html);  
          });
        });
      });
    }
    else{
      html += 'Sandbox not assigned<br>Open options and click Sandbox';
      callback(html);
    }
  }
  function getProjects(html,callback){
    getProjectSubDir("projects",function(subDirEntry){
      var name,dirReader = subDirEntry.createReader();
      dirReader.readEntries(function(results){
        var attrFileEntry,line,upload;
        var lineTemp = '<tr><th title="load into Editor" class="loadProjects" #attr# ><u>#name#</u></th>#save##upload#</tr>\n';
        var saveTemp = '<th title="Save Project">&nbsp;&nbsp;<button class="saveProject"></button>&nbsp;&nbsp;</th>';
        var uploadTemp = '<th title="upload Project">&nbsp;&nbsp;<button class="uploadProject" #attr# ></button>&nbsp;&nbsp;</th>';
        html += '<div id="p">';
        html += '<table width="100%">';
        for(var i = 0; i < results.length; i++){
          if(!results[i].isDirectory){
            name = results[i].name.split(".");
            if(name[1] === "lua"){
              attrFileEntry = 'fileEntry="' + chrome.fileSystem.retainEntry(results[i]) + '"';
              line = lineTemp.replace(/#attr#/,attrFileEntry).replace(/#name#/,name[0]);
              upload = uploadTemp.replace(/#attr#/,attrFileEntry);
              if(actualProject){
                if(actualProject.name === results[i].name){ line = line.replace(/#save#/,saveTemp); }
              }
              line = line.replace(/#save#/,"<th>&nbsp;</th>");
              line = line.replace(/#upload#/,upload);
              html += line;
            }
          }
        }
        html += '</table>';
        html += '<input type="text" value="newProject.lua" id="saveAsName"/> <button class="saveAsProject">Save as</button>';
        html += '</div>';
        callback(html);
      });
    });
  }
  function getProjectTable(html,subDir,ext,header,row,footer,callback){
    getProjectSubDir(subDir,gotSubDir);
    function gotSubDir(subDirEntry){
      var name,lhtml,lrow,dirReader = subDirEntry.createReader();
      dirReader.readEntries(function(results){
        lhtml = header;
        for(var i = 0; i < results.length;i++){
          if(!results[i].isDirectory){
            name = results[i].name.split(".");
            if(name.length > 0){
              if(name[1].toUpperCase() === ext){
                lrow = row.replace("$name0",name[0]);
                lrow = lrow.replace("$fileentry",chrome.fileSystem.retainEntry(results[i]));
                lrow = lrow.replace("$name",results[i].name);
                lhtml += lrow;
              }
            }
          }
        }
        lhtml += footer;
        callback(html + lhtml);        
      });
    }
  }
  function projectSave(){
    actualProject.createWriter(function(fileWriter){
      var bb = new Blob([LUA.Core.EditorLUA.getCode(true)],{type:'text/plain'});
      fileWriter.truncate(bb.size);
      setTimeout(function(evt){
        fileWriter.seek(0);
        fileWriter.write(bb);
      },200);
    });
    LUA.Core.App.closePopup();
  }
  function projectSaveAs(){
    getProjectSubDir("projects",function(dirEntry){
      var fileName = $("#saveAsName").val()
      saveFileAs(dirEntry,fileName,LUA.Core.EditorLUA.getCode(true));
      setProjectinHeader(fileName.split(".")[0]);
      LUA.Core.App.closePopup();
    });
  }
  function loadProject(){
    setProjectinHeader($(this)[0].childNodes[0].innerText);
    checkEntry($(this).attr("fileentry"),openProject);
    function openProject(theEntry){
      actualProject = theEntry;
      readFilefromEntry(theEntry,copySource);
      function copySource(data){
        LUA.Core.EditorLUA.setCode(data);
      }
    }
    LUA.Core.App.closePopup();
  }
  function updateProjectFolder(theEntry){
    var dirReader = theEntry.createReader();
    var entries = [];
    dirReader.readEntries (function(results) {
      if(!checkSubFolder(results,"projects")){ theEntry.getDirectory("projects", {create:true}); } 
      if(!checkSubFolder(results,"snippets")){ theEntry.getDirectory("snippets", {create:true}); saveSnippets(); }
      if(!checkSubFolder(results,"testing")){ theEntry.getDirectory("testing", {create:true}); }
      if(!checkSubFolder(results,"testinglog")){ theEntry.getDirectory("testinglog", {create: true}); }
      if(!checkSubFolder(results,"testinglog")){ theEntry.getDirectory("testinglog", {create: true}); } 
    });  
  }
  function setProjectinHeader(project){
    $("#actualProjectName").html("LUA WEB IDE (<i>" + project + '</i>)');
  }
  function uploadProject(){
    var fileName;
    if(LUA.Core.Serial.isConnected()){
      checkEntry($(this).attr("fileentry"),openProject);
      function openProject(theEntry){
        fileName = theEntry.name;
        readFilefromEntry(theEntry,uploadSource);
        function uploadSource(code){
          LUA.Core.Send.saveFile(fileName,code,function(){
            LUA.Core.Notifications.info("Project " + fileName + " uploaded");
          });
          setTimeout(function(){
            LUA.Core.App.closePopup();
            showProjectFile();  
          },500)
        }
      }        
    }
    else{
      LUA.Core.Notifications.warning("Not connected");
    }
  }

  function getLUAFiles(html,callback){
    if(LUA.Core.Serial.isConnected()){
      addProcessorGetWatched(waitingGetWatched);
      LUA.Core.Send.getFiles();         
    }
    else callback(html + '<div id="f">not connected to ESP8266</div>');
    function waitingGetWatched(data){
      removeProcessorGetWatched(2000);
      var l = JSON.parse(data);
      html += '<div id="f">' + getLUAFilesTable(l) + '</div>';
      callback(html);          
    }
  }
  function getLUAFilesTable(f){
    var i,html = "";
    html += '<table width="100%">';
    for(i in f){
      if(i.indexOf(".lua")> 0){
        html += '<tr><th title="Show" class="readLUAfile" file="' + i + '"><u>' + i + '</u></th>';
        html += '<th title="Execute">&nbsp;&nbsp;<button class="executeLUAfile" file="' + i + '"></button>&nbsp;&nbsp;</th>';
        html += '<th title="Drop">&nbsp;&nbsp;<button class="dropLUAfile" file="' + i + '"></button>&nbsp;&nbsp;</th>';
        html += '<th title="Compile">&nbsp;&nbsp;<button class="compileLUAfile" file="' + i + '"></button>&nbsp;&nbsp;</th>';          
        html += '</tr>';
      }
    }
    for(i in f){
      if((i.indexOf(".lc") + i.indexOf(".lua")) < 1){
        html += '<tr><th title="Show" class="readLUAfile" file="' + i + '"><u>' + i + '</u></th>';
        html += '<th title="Drop">&nbsp;&nbsp;<button class="dropLUAfile" file="' + i + '"></button>&nbsp;&nbsp;</th>';
        html += '</tr>';
      }
    }
    for(i in f){
      if(i.indexOf(".lc")> 0){
        html += '<tr><th title="Show"file="' + i + '">' + i + '</th>';
        html += '<th title="Drop">&nbsp;&nbsp;<button class="dropLUAfile" file="' + i + '"></button>&nbsp;&nbsp;</th>';
        html += '</tr>';
      }
    }
    html += '</table>';
    html += '<input type="text" size="30" value="myFile.lua" id="uploadFileName">';
    html += '<button class="uploadFileButton">upload File</button>';
    return html;
  }
  function uploadLUAFile(){
    var fileName,code;
    if(LUA.Core.Serial.isConnected()){
      fileName = $("#uploadFileName").val();
      code = LUA.Core.EditorLUA.getCode();
      LUA.Core.Send.saveFile(fileName,code,function(){
        LUA.Core.Notifications.info("file uploaded");
      });
    }
    else{
      LUA.Core.Notifications.warning("Not connected");
    }  
    LUA.Core.App.closePopup();
    setTimeout(function(){
      LUA.Core.App.closePopup();
      showProjectFile();  
    },500)
  }
  function dropLUAfile(){
    var fileName = $(this).attr("file");
    if(LUA.Core.Serial.isConnected()){
      LUA.Core.Send.dropFile(fileName);
    }
    else{
      LUA.Core.Notifications.warning("Not connected");
    }  
    LUA.Core.App.closePopup();
    setTimeout(function(){
      LUA.Core.App.closePopup();
      showProjectFile();  
    },500)
  }
  function doLUAfile(){
    var fileName = $(this).attr("file");
    if(LUA.Core.Serial.isConnected()){
      LUA.Core.Send.doFile(fileName);    
    }
    else{
      LUA.Core.Notifications.warning("Not connected");
    }  
    LUA.Core.App.closePopup();
  }
  function popupLUAfile(){
    var fileName = $(this).attr("file");
    if(LUA.Core.Serial.isConnected()){
      addProcessorGetWatched(waitingGetWatched,5000);
      LUA.Core.Send.readFile(fileName);
    }
    else{
      LUA.Core.Notifications.warning("Not connected");
    }
    function waitingGetWatched(data){
      var html;
      removeProcessorGetWatched();
      html = LUA.Core.Utils.escapeHTML(data);
      html = "<pre><code>" + html + "</code></pre>";
      html = '<button id="appendLUA2Editor">Append to Editor</button>' + html;
      html = '<button id="copyLUA2Editor">Copy to Editor</button><br>' + html;
      LUA.Core.App.closePopup();
      LUA.Core.App.openPopup({
        position: "relative",title: fileName,id: "LUAfileCode",contents: html
      });
      setTimeout(function(){
        $("#copyLUA2Editor").unbind().click(function(){ 
          LUA.Core.EditorLUA.setCode(data);
          actualProject = "";
          LUA.Core.App.closePopup();
        });
        $("#appendLUA2Editor").unbind().click(function(){
          LUA.Core.EditorLUA.setCode(LUA.Core.EditorLUA.getCode(true) + data);
          LUA.Core.App.closePopup();
        });
      },50);   
    }
  }
  function compileLUAfile(){
    var fileName = $(this).attr("file");
    if(LUA.Core.Serial.isConnected()){
      LUA.Core.Send.compileFile(fileName);
    }
    else{
      LUA.Core.Notifications.warning("Not connected");
    }
    setTimeout(function(){
      LUA.Core.App.closePopup();
      showProjectFile();  
    },500)
  }

  function loadFile(fileName,callback){
    var adr = fileName.split("/");
    getProjectSubDir(adr[0],getFile);
    function getFile(subDirEntry){
      checkFileExists(subDirEntry,adr[1],fileFound,fileNotFound);
    }
    function fileFound(theEntry){
      readFilefromEntry(theEntry,callback);
    }
    function fileNotFound(){
      LUA.Core.Notifications.error("File '" + fileName + "' not found");
    }
  }
  function saveFileAs(dirEntry,fileName,data){
    dirEntry.getFile(fileName,{create:true},function(fileEntry){
      actualProject = fileEntry;
      fileEntry.createWriter(function(fileWriter){
        var bb = new Blob([data],{type:'text/plain'});
        fileWriter.truncate(bb.size);
        setTimeout(function(evt){
          fileWriter.seek(0);
          fileWriter.write(bb);          
        },200);
      });
    });
  }
  function saveFile(fileName,data){
    var adr = fileName.split("/");
    getProjectSubDir(adr[0],gotDir);
    function gotDir(subDirEntry){
      if(!subDirEntry){ LUA.Core.Notifications.error("Project directory '" + adr[0] + "' is missing");}
      else{saveFileAs(subDirEntry,adr[1],data);}
    }
  }
  function loadDataUrl(fileName,callback){
    var adr = fileName.split("/");
    getProjectSubDir(adr[0],getFile);
    function getFile(subDirEntry){ 
      checkFileExists(subDirEntry,adr[1],fileFound,fileNotFound);
    }
    function fileFound(theEntry){
      readDataUrlfromEntry(theEntry,callback);
    }
    function fileNotFound(){
      LUA.Core.Notifications.error("File '" + fileName + "' not found");
    }
  }
  function loadDir(subDir,callback){
    getProjectSubDir(subDir,gotSubDir);
    function gotSubDir(subDirEntry){
      var dirReader = subDirEntry.createReader();
      dirReader.readEntries(function(results){
        callback(results);
      });
    }
  }
  function showIcon(newValue){
    if (iconFolder!==undefined) iconFolder.remove();
    if (iconSnippet!==undefined) iconSnippet.remove();
    iconFolder = undefined;
    iconSnippet = undefined;
    if(newValue){
      iconFolder = LUA.Core.App.addIcon({
        id: 'openProjectFolder',icon: 'folder',title: 'Projects',order: 500,
        area: { name: "code",position: "top"},
        click: showProjectFolder
      });
      iconSnippet = LUA.Core.App.addIcon({
        id:'terminalSnippets',icon: 'snippets',title: 'Snippets',order: 500,
        area: {name: "terminal",position: "top"},
        click: function(){
          var html = '<ul class="terminalSnippets">';
          for(var i in snippets){
            html += '<li class="terminalSnippet">' + i + '</li>';
          }
          html += '</ul>';
          LUA.Core.App.openPopup({
            position: "relative",title: "Snippets",id: "snippetPopup",contents: html,attachTo: "#icon-clearScreen"
          });
          $(".terminalSnippet").click(sendSnippets);
        }
      });        
    }
  }
  function showProjectFolder(){
    getProject("",function(html){
      LUA.Core.App.openPopup({
        position: "relative",title: "Projects",id: "projectsTab",contents: html,
        attachTo:"#icon-openProjectFolder",attachPosition:11
      });
      setTimeout(function(){
        $(".saveProject").button({ text: false, icons: { primary: "ui-icon-disk" } }).unbind().click(projectSave);
        $(".saveAsProject").button({ text:false, icons: { primary: "ui-icon-plusthick"} }).unbind().click(projectSaveAs);
        $(".dropSnippet").button({ text:false, icons: {primary: "ui-icon-trash"}}).unbind().click(dropSnippet);
        $(".addSnippet").button({ text:false, icons: { primary: "ui-icon-plusthick"} }).unbind().click(addSnippet);
        $(".loadProjects").unbind().click(loadProject);
        $(".uploadProject").button({ text:false, icons: { primary: "ui-icon-script"} }).unbind().click(uploadProject);
        $(".uploadFileButton").button({ text:false, icons: { primary: "ui-icon-script"} }).unbind().click(uploadLUAFile);
        $(".executeLUAfile").button({ text:false, icons: { primary: "ui-icon-play"}}).unbind().click(doLUAfile);
        $(".dropLUAfile").button({ text:false, icons:{ primary: "ui-icon-trash"}}).unbind().click(dropLUAfile);
        $(".compileLUAfile").button({ text:false, icons:{ primary: "ui-icon-copy"}}).unbind().click(compileLUAfile);
        $(".readLUAfile").unbind().click(popupLUAfile);
        $("#tabs").tabs();
      },50);       
    });
  }
  function appendFile(fileName,data){
    var adr = fileName.split("/");
    getProjectSubDir(adr[0],gotDir);
    function gotDir(subDirEntry){
      if(!subDirEntry){ LUA.Core.Notifications.error("Project directory '" + adr[0] + "' is missing");}
      else{
        subDirEntry.getFile(adr[1],{create:true},function(fileEntry){
          fileEntry.createWriter(function(fileWriter){
            var bb = new Blob([data],{type:'text/plain'});
            setTimeout(function(evt){
              if(fileWriter.length === 0) fileWriter.seek(0); else fileWriter.seek(fileWriter.length - 1);
              fileWriter.write(bb);          
            },100);
          });
        });
      }
    }
  }
  
  LUA.Plugins.Project = {
    init : init,
    
    loadFile: loadFile,
    loadDataUrl: loadDataUrl,
    saveFile: saveFile,
    appendFile: appendFile,
    loadDir: loadDir,
    loadDirHtml: getProjectTable
  };
}());