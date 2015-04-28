/**
 Copyright 2014 Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
 
 ------------------------------------------------------------------
  Try and get any URLS that are from GitHub
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  
  function init() {
    LUA.addProcessor("getURL", getGitHub);      
  }

function getGitHubOwner(owner,callback){
  var apiUrl = "https://api.github.com/users/" + owner + "/repos";
  $.getJSON(apiUrl,function(data){ callback(data);});
}
function getGitHubRepo(owner,repo,callback){
  var apiUrl = "https://api.github.com/repos/" + owner + "/" + repo + "/contents";
  $.getJSON(apiUrl,function(data){ callback(data);});
}
function getGitHubFile(owner,repo,path,branch,callback){
  var apiUrl="https://api.github.com/repos/"+owner+"/"+repo+"/contents/"+path+"?ref="+branch;
  $.getJSON(apiUrl,function(data){
    if(data.type=="file"&&data.encoding=="base64"){callback(window.atob(data.content));}
    else{console.log("this is no file, I like");}
  }).fail(function(a,b){
    LUA.Core.Notifications.warning("File " + path + " not found on github");
    callback(false);
  });
}
  
  function getGitHub(data, callback) {
    var match = undefined;
    if (!match) match = data.url.match(/^https?:\/\/github.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.*)$/);
    if (!match) match = data.url.match(/^https?:\/\/raw.githubusercontent.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.*)$/);
    if (match) {
      var git = {
          owner : match[1],
          repo : match[2],
          branch : match[3],
          path : match[4]
          };
      
      console.log("Found GitHub", JSON.stringify(git));
      var apiURL = "https://api.github.com/repos/"+git.owner+"/"+git.repo+"/contents/"+git.path+"?ref="+git.branch;
      $.get(apiURL, function(json) {
        if (json.type=="file" &&
            json.encoding=="base64") {
          // just load it...
          data.data = window.atob(json.content);
        } else {
          console.log("GET of "+apiURL+" returned JSON that wasn't a base64 encoded fine");          
        }
        callback(data);
      }, "json").fail(function() {
        console.log("GET of "+apiURL+" failed.");
        callback(data);
      });
    } else
      callback(data); // no match - continue as normal
  }

  LUA.Plugins.GetGitHub = {
    init : init,
    getGitHub : getGitHub,
    getGitHubOwner : getGitHubOwner,
    getGutHubRepo : getGitHubRepo,
    getGitHubFile : getGitHubFile
  };
}());