var express = require("express");

var socket = require("socket.io");

var app = express();

var fs = require("fs");

var path = require('path');

var server = app.listen(3074, function(){
  console.log("Started server on port 3074");
});

var chat = [];

// Static files

app.use(express.static("public"))

// Socket setup

var io = socket(server);

var loggedInUsers = new Array();
var worldData = new Array();

io.on("connection", function(socket){

  socket.on("signupReq", function(data){
    createAccount(data.username, data.pin, socket.id);
  });
  
  socket.on("loginReq", function(data){
    loginAccount(data.username.toLowerCase(), data.pin, socket.id);
  });
  
  socket.on("move", function(pos){
  // Move player request
  for(var i = 0; i < loggedInUsers.length; i++){
    if(loggedInUsers[i].socket === socket.id){
      var username = loggedInUsers[i].username;
      for(var i = 0; i < worldData.length; i++){
        if(worldData[i].username === username.toLowerCase()){
          worldData[i].x = pos.x;
          worldData[i].y = pos.y;
          worldData[i].orientation = pos.orientation;
        } 
      }
      break;
    }
  }
});
  
  socket.on("chat", function(package){
    // On chat messages or commands
    
    // TODO Add profanity filter
    
    var account = loadAccount(package.username)
    if(account === false) return;
    if(account.pin != package.pin) return;
    
    package.username = account.orgUsername;
    package.authority = account.authority;
    
    chat.push(package);
    io.emit("chat_update", package);
    if(chat.length > 20){
      chat.splice(0, 1); // Trim the chat.
    }
  })
  
  socket.on('disconnect', function(){
    
    for(var i = 0; i < loggedInUsers.length; i++){
      if(loggedInUsers[i].socket == socket.id){
        var username = loggedInUsers[i].username;
        
        loggedInUsers.splice(i, 1); // Remove session token when user disconnects.

        for(var i = 0; i < worldData.length; i++){
          if(worldData[i].username == username){
            saveAccount(username, worldData[i].x, worldData[i].y);
            worldData.splice(i, 1);
          } // Remove from game world
        }
        break;
      } 
      
    }
  });
     
  
  
  /* END OF SOCKET */
  
});

setInterval(tick, 0.0666);

function tick(){
  io.emit("tick", worldData);
}

function saveAccount(username, x, y){
  var account = loadAccount(username);
  if(account === false) return;
  account.lastX = x;
  account.lastY = y;
  account = JSON.stringify(account);
  account.lastOnline = Date.now();
  fs.writeFileSync("accounts/"+username+".txt", account);
}

function loginAccount(username, pin, socket){
  var err = null;
  for(var i = 0; i < loggedInUsers.length; i++){
    if(loggedInUsers[i].username == username){
      io.sockets.connected[socket].emit("err", "This account is already in-game. Please logout on that system first.");
      return;
    }
  }
  try{
    var account = fs.readFileSync("accounts/"+username+".txt", "utf8");
  } catch(e){
    io.sockets.connected[socket].emit("err", "This username is not registered. <a href='javascript:showSignup();'>You can signup here!</a>");
    return;
  }
  try{
    var account = JSON.parse(account);
  } catch(e){
    io.sockets.connected[socket].emit("err", "Account is corrupt, please contact Bird Club Support"); // TODO ADD SUPPORT LINK
    return;
  }
  if(Number(account.pin) === Number(pin)){
    // Correct pin
    io.sockets.connected[socket].emit("callback_loggedIn", {
      x: account.lastX,
      y: account.lastY,
      username: account.orgUsername,
      chat: chat
    });
    
    loggedInUsers.push({socket: socket, username: account.username}); // Load user session token
    worldData.push({username: username, orgUsername: account.orgUsername, skin: account.skin, x: account.lastX, y: account.lastY}); // Load user into the world.
    return;
    
  } else {
    io.sockets.connected[socket].emit("err", "Wrong pin."); // TODO ADD SUPPORT LINK
    return;
  }
}

function createAccount(username, pin, socket){
  var orgUsername = username;
  username = username.toLowerCase(); // Store usernames for login as lowercase, but save original username for displaying ingame.
  var validation = validateAccount(username, pin);
  if(validation !== true){
    io.sockets.connected[socket].emit("err", validation);
    return;
  }
  /* Account is clear to be created. */
  
  /* TODO Skin selection, temp fix random skin */
  var skin = Math.floor(Math.random()*3)+1;
  var newAccTemplate = JSON.stringify({username: username, pin: pin, orgUsername: orgUsername ,joinedDate: Date.now(), lastX: 340, lastY: 210, inventory: "", skin: skin, authority: none, condition: "good"});
  fs.writeFileSync("accounts/"+username+".txt", newAccTemplate);
  io.sockets.connected[socket].emit("err", "<span style='color:#53ed55'>Success! You are now a member of the Bird Club. <a href='javascript:showLogin()'>You can now login</a></span>");
  // Account has been created.
}

function validateAccount(username, pin){
  /* Validate account on login and on signup */
  var err = null;
  if(readAccount(username)) err = "Ops, that username is already registered!";
  if(username.length > 20 || username.length < 3) err = "Your username must be between 3-20 characters long!";
  if(!username.match(/^[0-9a-z]+$/)) err = "Username has to be alphanumeric!";
  if(isNaN(Number(pin))) err = "Pin has to be numbers!";
  if(pin.length > 20 || pin.length < 4) err = "Pin has to be between 4-20 numbers long.";
  
  if(err === null){
    return true;
  } else {
    return err;
  }
}

/* Test read account to see if it exist */
function readAccount(username){
  try{
    fs.readFileSync("accounts/"+username+".txt", "utf8");
    return true;
  } catch(e){
    return false;
  }
}

function loadAccount(username){
  try{
    var account = fs.readFileSync("accounts/"+username+".txt", "utf8");
    return JSON.parse(account);
  } catch(e){
    return false;
  }
}
