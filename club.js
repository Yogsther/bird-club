/**
 * Bird Cloud mmo script
 */

var socket = io.connect("https://213.66.254.63:3074", {secure: true}); // Connect to server


/* Declare canvas */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.save();

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
    } 
    if(showLogin) loginFromPage();
  } else {
    if(keysDown.indexOf(key.keyCode) == -1) keysDown.push(key.keyCode); 
  }
})

document.body.addEventListener("keyup", function(key){
  for(var i = 0; i < keysDown.length; i++){
    if(keysDown[i] == key.keyCode) keysDown.splice(i, 1);
  }
});

/* Mouse poistion handler */
var mousePos;
canvas.addEventListener("mousemove", function(event){
  mousePos = getMousePos(canvas, event); // Update mousePos every time the mouse moves.
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

function addWaypoint(x, y){
  if(y < 86) return;
  waypointPosition = {x: x, y: y};
  waypointActive = true;
}

var lastPos = {};
function moveToWaypoint(){
  // TODO Pathfinding
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
    orientation = 0;
  }
  if(waypointPosition.y > myPosition.y){
    myPosition.y += speed_y;
  }
  if(waypointPosition.y < myPosition.y){
    myPosition.y -= speed_y;
  }

  if(waypointPosition.x < myPosition.x){
    myPosition.x -= speed_x;
    orientation = 1;
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

function heartbeat(){
  
  
  if(!loggedIn){
    ctx.drawImage(texture_splash, 0,0);
    requestAnimationFrame(heartbeat);
    return;
  }
  
  /* Handle movement */
  if(waypointPosition.x != myPosition.x || waypointPosition.y != myPosition.y){
    moveToWaypoint();
    socket.emit("move", {
      x: myPosition.x,
      y: myPosition.y,
      orientation: orientation 
    });
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
    var waypointWidth = texture_waypoint.width;
    var offset = waypointWidth / 4;
    ctx.drawImage(texture_waypoint, waypointPosition.x - offset, waypointPosition.y - offset, 50, 50);
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