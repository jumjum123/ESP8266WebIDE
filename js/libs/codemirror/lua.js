// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE
// LUA mode. Ported to CodeMirror 2 from Franciszek Wawrzak's
// CodeMirror 1 mode.
// highlights keywords, strings, comments (no leveling supported! ("[==[")), tokens, basic indenting
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("js/libs/codemirror/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["js/libs/codemirror/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})
(function(CodeMirror) {
  "use strict";
  CodeMirror.defineMode("lua", function(config, parserConfig) {
    var indentUnit = config.indentUnit;
    function prefixRE(words) {
      return new RegExp("^(?:" + words.join("|") + ")", "i");
    }
    function wordRE(words) {
      return new RegExp("^(?:" + words.join("|") + ")$", "i");
    }
    var specials = wordRE(parserConfig.specials || []);
    // long list of standard functions from lua manual
    var builtins = wordRE([
      "_G","_VERSION","assert","collectgarbage","dofile","error","getfenv","getmetatable","ipairs","load",
      "loadfile","loadstring","module","next","pairs","pcall","print","rawequal","rawget","rawset","require",
      "select","setfenv","setmetatable","tonumber","tostring","type","unpack","xpcall",
      "coroutine.create","coroutine.resume","coroutine.running","coroutine.status","coroutine.wrap","coroutine.yield",
      "debug.debug","debug.getfenv","debug.gethook","debug.getinfo","debug.getlocal","debug.getmetatable",
      "debug.getregistry","debug.getupvalue","debug.setfenv","debug.sethook","debug.setlocal","debug.setmetatable",
      "debug.setupvalue","debug.traceback",
      "close","flush","lines","read","seek","setvbuf","write",
      "io.close","io.flush","io.input","io.lines","io.open","io.output","io.popen","io.read","io.stderr","io.stdin",
      "io.stdout","io.tmpfile","io.type","io.write",
      "math.abs","math.acos","math.asin","math.atan","math.atan2","math.ceil","math.cos","math.cosh","math.deg",
      "math.exp","math.floor","math.fmod","math.frexp","math.huge","math.ldexp","math.log","math.log10","math.max",
      "math.min","math.modf","math.pi","math.pow","math.rad","math.random","math.randomseed","math.sin","math.sinh",
      "math.sqrt","math.tan","math.tanh",
      "node.restart","node.dsleep","node.info","node.chipid","node.flashid","node.heap",
      "node.input","node.output","node.readvdd33","node.compile",
      "file.remove","file.open","file.close","file.readline","file.writeline","file.read","file.write",
      "file.flush","file.seek","file.list","file.format","file.rename",
      "wifi.setmode","wifi.getmode","wifi.startsmart","wifi.stopsmart","wifi.sleeptype",
      "wifi.sta.config","wifi.sta.connect","wifi.sta.disconnect","wifi.sta.autoconnect","wifi.sta.getip",
      "wifi.sta.setip","wifi.sta.getmac","wifi.sta.setmac","wifi.sta.getap","wifi.sta.status","wifi.sta.getbroadcast",
      "wifi.ap.config","wifi.ap.getip","wifi.ap.setip","wifi.ap.getmac","wifi.ap.setmac","wifi.ap.getbroadcast",
      "tmr.delay","tmr.now","tmr.alarm","tmr.stop","tmr.wdclr","tmr.time",
      "gpio.mode","gpio.read","gpio.write","gpio.trig",
      "pwm.setup","pwm.close","pwm.start","pwm.stop","pwm.setclock","pwm.getclock","pwm.setduty","pwm.getduty",
      "net.createServer","net.createConnect","net.server:listen","net.server:close",
      "net.socket:connect","net.socket:send","net.socket:on","net.socket:close","net.socket:dns",
      "i2c.setup","i2c.start","i2c.stop","i2c.address","i2c.write","i2c.read",
      "adc.read",
      "uart.setup","uart.on","uart.write",
      "ow.setup","ow.reset","ow.skip","ow.select","ow.write","ow.write_bytes","ow.read","ow.read_bytes","ow.depower",
      "ow.seret_search","ow.target_search","ow.search","ow.crc8","ow.check_crc16","ow.crc16",
      "bit.bnot","bit.band","bit.bor","bit.bxor","bit.lshift","bit.rshift",
      "bit.arshift","bit.bit","bit.set","bit.clear","bit.isset","bit.isclear",
      "spi.setup","spi.send","spi.recv",
      "mqtt.Client","mqtt.client:lwt","mqtt.client:connect","mqtt.client:close",
      "mqtt.client:publish","mqtt.client:subscribe","mqtt.client:on",
      "os.clock","os.date","os.difftime","os.execute","os.exit","os.getenv","os.remove","os.rename","os.setlocale",
      "os.time","os.tmpname",
      "package.cpath","package.loaded","package.loaders","package.loadlib","package.path","package.preload",
      "package.seeall",
      "string.byte","string.char","string.dump","string.find","string.format","string.gmatch","string.gsub",
      "string.len","string.lower","string.match","string.rep","string.reverse","string.sub","string.upper",
      "table.concat","table.insert","table.maxn","table.remove","table.sort"
    ]);
    var keywords = wordRE(["and","break","elseif","false","nil","not","or","return",
      "true","function", "end", "if", "then", "else", "do",
      "while", "repeat", "until", "for", "in", "local" ]);
    var indentTokens = wordRE(["function", "if","repeat","do", "\\(", "{"]);
    var dedentTokens = wordRE(["end", "until", "\\)", "}"]);
    var dedentPartial = prefixRE(["end", "until", "\\)", "}", "else", "elseif"]);
    function readBracket(stream) {
      var level = 0;
      while (stream.eat("=")) ++level;
      stream.eat("[");
      return level;
    }
    function normal(stream, state) {
      var ch = stream.next();
      if (ch == "-" && stream.eat("-")) {
        if (stream.eat("[") && stream.eat("["))
          return (state.cur = bracketed(readBracket(stream), "comment"))(stream, state);
        stream.skipToEnd();
        return "comment";
      }
      if (ch == "\"" || ch == "'")
        return (state.cur = string(ch))(stream, state);
      if (ch == "[" && /[\[=]/.test(stream.peek()))
        return (state.cur = bracketed(readBracket(stream), "string"))(stream, state);
      if (/\d/.test(ch)) {
        stream.eatWhile(/[\w.%]/);
        return "number";
      }
      if (/[\w_]/.test(ch)) {
        stream.eatWhile(/[\w\\\-_.]/);
        return "variable";
      }
      return null;
    }
    function bracketed(level, style) {
      return function(stream, state) {
        var curlev = null, ch;
        while ((ch = stream.next()) != null) {
          if (curlev == null) {if (ch == "]") curlev = 0;}
          else if (ch == "=") ++curlev;
          else if (ch == "]" && curlev == level) { state.cur = normal; break; }
          else curlev = null;
        }
        return style;
      };
    }
    function string(quote) {
      return function(stream, state) {
        var escaped = false, ch;
        while ((ch = stream.next()) != null) {
          if (ch == quote && !escaped) break;
            escaped = !escaped && ch == "\\";
        }
        if (!escaped) state.cur = normal;
        return "string";
      };
    }
    return {
      startState: function(basecol) {
        return {basecol: basecol || 0, indentDepth: 0, cur: normal};
      },
      token: function(stream, state) {
        if (stream.eatSpace()) return null;
        var style = state.cur(stream, state);
        var word = stream.current();
        if (style == "variable") {
          if (keywords.test(word)) style = "keyword";
          else if (builtins.test(word)) style = "builtin";
          else if (specials.test(word)) style = "variable-2";
        }
        if ((style != "comment") && (style != "string")){
          if (indentTokens.test(word)) ++state.indentDepth;
          else if (dedentTokens.test(word)) --state.indentDepth;
        }
        return style;
      },
      indent: function(state, textAfter) {
        var closing = dedentPartial.test(textAfter);
        return state.basecol + indentUnit * (state.indentDepth - (closing ? 1 : 0));
      },
      lineComment: "--",
      blockCommentStart: "--[[",
      blockCommentEnd: "]]"
    };
  });
  CodeMirror.defineMIME("text/x-lua", "lua");
});