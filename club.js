/**
 * Bird Cloud mmo script
 */

var socket = io.connect("http://213.66.254.63:3074"); // Connect to server


/* Declare canvas */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");


/* Declare global variables */
var loggedIn = false;
var showingSignup = false;
var showingLogin = false;
var offline = true;
var keysDown = [];
var myPosition = {};
var worldData = [];
var orientation = 0;

var onlineUsers = 0;

var room = 1;

login(); // Try to log in, if fails show sign-up page.
heartbeat(); // Start rendering

function login(){
  var username = readCookie("username");
  var pin = readCookie("pin");
  
  if(pin == null || username == null){
    showSignup();
    return;
  }
  
  loginFinal(username, pin);
}



socket.on("tick", function(package){
  // Global tick
  worldData = package;
})


document.body.addEventListener("keydown", function(key){
  if(key.keyCode == 13){
    // Enter pressed
    if(showingSignup){
      signup();
      return;
    } else if(showingLogin){
      loginFromPage();
    } else {
    // Send chat message
    sendMessage();
    }
  }
});


var lastSentOrientation = 0;

/* Mouse poistion handler */
var mousePos;
canvas.addEventListener("mousemove", function(event){
  mousePos = getMousePos(canvas, event); // Update mousePos every time the mouse moves.
  if(mousePos.x > myPosition.x){
    orientation = 0;
  } else {
    orientation = 1;
  }
  if(lastSentOrientation !== orientation){
    tickMove();
    lastSentOrientation = orientation;
  }
  
});

function getMousePos(canvas, evt) {
  // Don't use this function - It's only a complimentary to the mousemove listener.
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left + 10,
      y: evt.clientY - rect.top + 0
  };
}

canvas.addEventListener("click", function(event){
  addWaypoint(mousePos.x, mousePos.y); // When mouse is clicked on the canvas. (Click to move)
});

var waypointPosition = {x: myPosition.x, y: myPosition.y};
var waypointActive = false;
var waypointRotation = 0;
var waypointScale = 1;

function addWaypoint(x, y){
  if(y < 86) return;
  waypointPosition = {x: x, y: y};
  waypointActive = true;
  waypointRotation = 0;
  waypointScale = 1;
  
}

var lastPos = {};
function moveToWaypoint(){
  /*
  This code will just correct the poistion of the player to the position of the waypoint.
  Straight forward pathfinding, and this may be enough. I don't know - I guess movement will be
  a bit more involved. We can't do pathfinding until we have setup collisisons.
  */
  var player_speed = 2.7;
  
  var speed_x = player_speed;
  var speed_y = Math.abs((waypointPosition.y - myPosition.y) / (waypointPosition.x - myPosition.x)) * player_speed;
  if(speed_y > player_speed) {
    speed_x = (player_speed / speed_y);
    speed_y = player_speed;
  }
  if(waypointPosition.x > myPosition.x){
    myPosition.x += speed_x;
  }
  if(waypointPosition.y > myPosition.y){
    myPosition.y += speed_y;
  }
  if(waypointPosition.y < myPosition.y){
    myPosition.y -= speed_y;
  }

  if(waypointPosition.x < myPosition.x){
    myPosition.x -= speed_x;
  }
  if(lastPos.x == myPosition.x && lastPos.y == myPosition.y){
    waypointActive = false;
    orientation = lastPos.orientation;
  }
  
  lastPos = {
    x: myPosition.x,
    y: myPosition.y,
    orientation: orientation
  }
  

}

canvas.addEventListener('contextmenu', event => event.preventDefault());

function drawImage(image, x, y, scale, rotation){
    ctx.setTransform(scale, 0, 0, scale, x, y); // sets scale and origin
    ctx.rotate(rotation);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
} 

function tickMove(){
  socket.emit("move", {
      x: myPosition.x,
      y: myPosition.y,
      orientation: orientation
    });
}

function heartbeat(){
  
  
  if(!loggedIn){
    ctx.drawImage(texture_splash, 0,0);
    requestAnimationFrame(heartbeat);
    return;
  }
  
  /* Handle movement */
  if(waypointActive){
    moveToWaypoint();
    tickMove();
  }
  
  // Update status
  if(worldData.length != onlineUsers){
    onlineUsers = worldData.length;

    var title = "";
    for(var i = 0; i < worldData.length; i++){
      title += worldData[i].orgUsername + "\n";
    }
    
    document.getElementById("insert-online-users").innerHTML = 'Online users: ' + onlineUsers + ' <img src="img/drop-down.png" title="' + title + '" id="drop-down">';
  }
  
  // Draw game
  ctx.fillStyle = "#7AC45F";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw room
  ctx.drawImage(eval("texture_room_" + room), 0, 0);
  
  // Draw users
  for(var i = 0; i < worldData.length; i++){
    var user = worldData[i];
    var skin = eval("texture_bird_0" + user.skin);
    var offset = 35;
    var x = user.x - (skin.width/7.14) + offset;
    var y = user.y - (skin.height/7.14) + offset;

    // Draw usernames and chat overhead.
    ctx.font = "15px Ubuntu";
    ctx.fillStyle = "white";
    ctx.textAlign = "center"; 
    ctx.fillText(user.orgUsername, x + 33, y+4); // Draw player name-tag
    ctx.save();
    if(user.orientation == 1){
      // Flip
      ctx.scale(-1, 1);
      x = x * -1 - 66;
    }
    ctx.drawImage(skin, x, y, 70, 70); // Draw player skin
    ctx.restore();

  }
  if(waypointActive){
    
    if(orientation == 1){
      waypointRotation -= 0.1;
    } else {
      waypointRotation += 0.1;
    }
    if(waypointScale > 0.5) waypointScale -= 0.1;
    var offset = 10; // Offset removed.
    ctx.save();
    drawImage(texture_waypoint, waypointPosition.x - offset, waypointPosition.y, waypointScale, waypointRotation);
    ctx.restore();
  }
  
  requestAnimationFrame(heartbeat);
}

socket.on("err", function(err){
  /* Callback from server with login / signup status. */
  try{
    document.getElementById("err_message").innerHTML = "<span color='#d84747'>" + err + "</span>";
  } catch(e){
    showLogin();
    document.getElementById("err_message").innerHTML = "<span color='#d84747'>" + err + "</span>";
  }
  
});

function signup(){
  var username = document.getElementById("username").value;
  var pin = document.getElementById("pin").value;

  socket.emit("signupReq", {
    username: username,
    pin: pin
  });
  
}

function loginFinal(username, pin){
  
  socket.emit("loginReq", {
    username: username.toLowerCase(),
    pin: pin
  });

}

function loginFromPage(){
  var username = document.getElementById("username").value;
  var pin = document.getElementById("pin").value;
  var cookieLife = null;
  if(document.getElementById("keepLoggedIn").checked) cookieLife = 10000;
  createCookie("username", username, cookieLife);
  createCookie("pin", pin, cookieLife);
  loginFinal(username, pin);
}


socket.on("callback_loggedIn", function(data){
  offline = false;
  clearOverlay();
  document.getElementById("online-status").style.backgroundColor = "#47f76a";
  document.getElementById("online-status").title = "Connected to servers!";
  document.getElementById("insert-status").innerHTML = data.username + ' <a href="javascript:logout()" style="text-decoration: none;">[Logout]</a>';
  loggedIn = true;
  myPosition = {
      x: data.x,
      y: data.y
    }
  waypointPosition = myPosition;
  loadChat(data.chat);

})

function logout(){
  deleteAllCookies();
  location.reload();
}

function clearOverlay(){ document.getElementById("overlay-insert").innerHTML = "" };



function showSignup(){
  document.getElementById("overlay-insert").innerHTML = '<div id="backdrop"> <div id="overlay"> <br> <h4>Sign up to Bird Club™ Pre Alpha</h4><br> <a href="javascript:showLogin()">Already a member?</a><br><br> Username:<br> <input id="username" placeholder="Username" type="text"><br> Pin (password):<br> <input id="pin" placeholder="123456" type="password"><br> <button class="btn" onclick="signup()">Become a member!</button> <div id="err_message"></div> </div></div>';
  showingSignup = true;
  showingLogin = false;
  document.getElementById("username").focus();
}

function showLogin(){
  document.getElementById("overlay-insert").innerHTML = '<div id="backdrop"> <div id="overlay"> <br> <h4>Login to Bird Club™ Pre Alpha</h4><br> <a href="javascript:showSignup()">Not a member?</a><br><br> Username:<br> <input id="username" placeholder="Username" type="text"><br> Pin:<br> <input id="pin" placeholder="123456" type="password"><br> Keep me logged in: <input type="checkbox" checked="true" id="keepLoggedIn"><br> <button class="btn" onclick="loginFromPage()">Login!</button> <div id="err_message"></div> </div></div>';
  showingSignup = false;
  showingLogin = true;
  document.getElementById("username").focus();
}


/* Other, non-main functions */

function loadChat(chat){
  for(var i = 0; i < chat.length; i++){
    addChatMessage(chat[i]);
  }
}

function addChatMessage(message){
  var chatWindow = document.getElementById("chat-window");
  
  chatWindow.innerHTML += '<div class="chat-message" color="red"><span class="prefix" color="">[MOD]</span><span class="chat-username">' + message.username + ':</span><span class="chat-message-only">' + message.message + '</span></div>';
  
  
  chatWindow.scrollTop = chatWindow.scrollHeight;
  
}

socket.on("chat_update", function(message){
  addChatMessage(message);
})

function sendMessage(){
  var chatMessage = document.getElementById("chat-input").value;
  if(chatMessage == "") return;
  socket.emit("chat", {
    username: readCookie("username"),
    pin: readCookie("pin"),
    message: chatMessage
  });
  console.log("Sent message");
  document.getElementById("chat-input").value = "";
}

var backpackUp = false;
function toggleBackpack(){
  if(backpackUp){
    clearBackpack();
    backpackUp = false;
  } else {
    overlayBackpack();
    backpackUp = true;
  }
}

function overlayBackpack(){
  document.getElementById("backpack-icon").src = "img/backpack_open.png";
  var backpack = '<div id="backpack" class="noselect"> <img src="img/bird_01.png" id="bird-preview" class="nodrag"><div id="backpack-grid">  </div></div>';

  // TODO Insert inventory <img class="item-preview" src="">
  
  document.getElementById("backpack-overlay").innerHTML = backpack;
  for(var i = 0; i < 48; i++){
    document.getElementById("backpack-grid").innerHTML += '<div class="item-slot" id="backpack_slot_' + i + '"></div>';
  }
}

function clearBackpack(){
  document.getElementById("backpack-icon").src = "img/backpack_closed.png";
  document.getElementById("backpack-overlay").innerHTML = "";
}

function createCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function deleteAllCookies() {
    var cookies = document.cookie.split(";");

    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        var eqPos = cookie.indexOf("=");
        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
}