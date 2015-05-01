chrome.app.runtime.onLaunched.addListener(function(launchData) {
  chrome.app.window.create('main.html', {
    id:"LUA_mainwindow", width: 1024, height: 600, singleton: true,frame: 'none'
  },
  function(win) {  });
});