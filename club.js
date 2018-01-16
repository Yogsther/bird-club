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
var devmode = false;

var onlineUsers = 0;

var room = 1;

login(); // Try to log in, if fails show sign-up page.
heartbeat(); // Start rendering

function login() {
  var username = readCookie("username");
  var pin = readCookie("pin");

  if (pin == null || username == null) {
    showSignup();
    return;
  }

  loginFinal(username, pin);
}



socket.on("tick", function (package) {
  // Global tick
  worldData = package;
})


document.body.addEventListener("keydown", function (key) {
  if (key.keyCode == 13) {
    // Enter pressed
    if (showingSignup) {
      signup();
      return;
    } else if (showingLogin) {
      loginFromPage();
    } else {
      document.getElementById("chat-input").focus();
      sendMessage();
    }
  }
});


var lastSentOrientation = 0;

/* Mouse poistion handler */
var mousePos;
canvas.addEventListener("mousemove", function (event) {
  mousePos = getMousePos(canvas, event); // Update mousePos every time the mouse moves.
  if (mousePos.x > myPosition.x) {
    orientation = 0;
  } else {
    orientation = 1;
  }
  if (lastSentOrientation !== orientation) {
    tickMove();
    lastSentOrientation = orientation;
  }
  if (devmode) console.log(mousePos);

});

function getMousePos(canvas, evt) {
  // Don't use this function - It's only a complimentary to the mousemove listener.
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left + 10,
    y: evt.clientY - rect.top + 0
  };
}

canvas.addEventListener("click", function (event) {
  addWaypoint(mousePos.x, mousePos.y); // When mouse is clicked on the canvas. (Click to move)
});

var waypointPosition = {
  x: myPosition.x,
  y: myPosition.y
};
var waypointActive = false;
var waypointRotation = 0;
var waypointScale = 1;

function addWaypoint(x, y) {
  if (y < 86) return;
  waypointPosition = {
    x: x,
    y: y
  };
  waypointActive = true;
  waypointRotation = 0;
  waypointScale = 1;

}

var lastPos = {};

function moveToWaypoint() {
  /*
  This code will just correct the poistion of the player to the position of the waypoint.
  Straight forward pathfinding, and this may be enough. I don't know - I guess movement will be
  a bit more involved. We can't do pathfinding until we have setup collisisons.
  */
  var player_speed = 2.7;

  var speed_x = player_speed;
  var speed_y = Math.abs((waypointPosition.y - myPosition.y) / (waypointPosition.x - myPosition.x)) * player_speed;
  if (speed_y > player_speed) {
    speed_x = (player_speed / speed_y);
    speed_y = player_speed;
  }
  if (waypointPosition.x > myPosition.x) {
    myPosition.x += speed_x;
  }
  if (waypointPosition.y > myPosition.y) {
    myPosition.y += speed_y;
  }
  if (waypointPosition.y < myPosition.y) {
    myPosition.y -= speed_y;
  }

  if (waypointPosition.x < myPosition.x) {
    myPosition.x -= speed_x;
  }
  if (lastPos.x == myPosition.x && lastPos.y == myPosition.y) {
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

function drawImage(image, x, y, scale, rotation) {
  ctx.setTransform(scale, 0, 0, scale, x, y); // sets scale and origin
  ctx.rotate(rotation);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
}

var lastTick = 0;

function tickMove() {
  var now = Date.now();
  /* Tick cap, prevents server overload */
  if (now - lastTick < 90) {
    return;
  }
  socket.emit("move", {
    x: myPosition.x,
    y: myPosition.y,
    orientation: orientation
  });
  lastTick = Date.now();

}

function enableDev() {
  devmode = true;
}

function heartbeat() {

  if (myPosition.x == undefined || myPosition.y == undefined) {
    /* Prevent bugs */
    myPosition.x = canvas.width / 2;
    myPosition.y = canvas.height / 2;
  }

  if (!loggedIn) {
    ctx.drawImage(texture_splash, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(heartbeat);
    return;
  }

  /* Handle movement */
  if (waypointActive) {
    moveToWaypoint();
    tickMove();
  }

  // Update status
  if (worldData.length != onlineUsers) {
    onlineUsers = worldData.length;

    var title = "";
    for (var i = 0; i < worldData.length; i++) {
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
  for (var i = 0; i < worldData.length; i++) {
    var user = worldData[i];

    var skin = eval("texture_bird_" + user.skin);
    var offset = 35;
    var x = user.x - (skin.width / 7.14) + offset;
    var y = user.y - (skin.height / 7.14) + offset;

    /* This code prevents lag and renderes your own character offline with your own positional data. */
    /* TODO Test this, and make sure it's making for a smoother experience! */
    if (user.orgUsername.toLowerCase() == account.username) {
      x = myPosition.x - (skin.width / 7.14) + offset;
      y = myPosition.y - (skin.height / 7.14) + offset;
    }

    // Draw usernames and chat overhead.
    ctx.font = "15px Ubuntu";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(user.orgUsername, x + 33, y + 4); // Draw player name-tag
    ctx.save();
    if (user.orientation == 1) {
      // Flip
      ctx.scale(-1, 1);
      x = x * -1 - 66;
    }
    ctx.drawImage(skin, x, y, 70, 70); // Draw player skin
    ctx.restore();

  }
  if (waypointActive) {

    if (orientation == 1) {
      waypointRotation -= 0.1;
    } else {
      waypointRotation += 0.1;
    }
    if (waypointScale > 0.5) waypointScale -= 0.1;
    var offset = 10; // Offset removed.
    ctx.save();
    drawImage(texture_waypoint, waypointPosition.x - offset, waypointPosition.y, waypointScale, waypointRotation);
    ctx.restore();
  }

  requestAnimationFrame(heartbeat);
}

socket.on("err", function (err) {
  /* Callback from server with login / signup status. */
  try {
    document.getElementById("err_message").innerHTML = "<span color='#d84747'>" + err + "</span>";
  } catch (e) {
    showLogin();
    document.getElementById("err_message").innerHTML = "<span color='#d84747'>" + err + "</span>";
  }

});

function signup() {
  var username = document.getElementById("username").value;
  var pin = document.getElementById("pin").value;

  socket.emit("signupReq", {
    username: username,
    pin: pin,
    skin: birdID
  });

}

function loginFinal(username, pin) {

  socket.emit("loginReq", {
    username: username.toLowerCase(),
    pin: pin
  });

}

function loginFromPage() {
  var username = document.getElementById("username").value;
  var pin = document.getElementById("pin").value;
  var cookieLife = null;
  if (document.getElementById("keepLoggedIn").checked) cookieLife = 10000;
  createCookie("username", username, cookieLife);
  createCookie("pin", pin, cookieLife);
  loginFinal(username, pin);
}


socket.on("callback_loggedIn", function (data) {
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
  showingLogin = false;
  showingSignup = false;
  waypointPosition = myPosition;
  loadChat(data.chat);
  window.account = data.account;

})

function logout() {
  deleteAllCookies();
  location.reload();
}

function clearOverlay() {
  document.getElementById("overlay-insert").innerHTML = ""
};



function showSignup() {
  window.birdID = 1;
  document.getElementById("overlay-insert").innerHTML = '<div id="backdrop"> <div id="overlay"> <br> <h4>Sign up to Bird Club™ Pre Alpha</h4><br> <a href="javascript:showLogin()">Already a member?</a><br><br> Username:<br> <input id="username" placeholder="Username" type="text"><br> Pin (password):<br> <input id="pin" placeholder="123456" type="password"><br><div id="choose_bird"></div><br><button class="btn" onclick="signup()">Become a member!</button> <div id="err_message"></div> </div></div>';
  showingSignup = true;
  showingLogin = false;
  for (var i = 1; i < 5; i++) {
    // Do 4 times
    document.getElementById("choose_bird").innerHTML += '<img class="choose_bird" src="img/bird_' + i + '.png" onclick="chooseBird(' + i + ')">';
  }
  chooseBird(1)
  document.getElementById("username").focus();
}

function chooseBird(id) {
  birdID = id;
  for (var i = 1; i < 5; i++) {
    if (id == i) {
      document.getElementsByClassName("choose_bird")[i - 1].style.background = "white";
    } else {
      document.getElementsByClassName("choose_bird")[i - 1].style.background = "";
    }
  }
}

function showLogin() {
  document.getElementById("overlay-insert").innerHTML = '<div id="backdrop"> <div id="overlay"> <br> <h4>Login to Bird Club™ Pre Alpha</h4><br> <a href="javascript:showSignup()">Not a member?</a><br><br> Username:<br> <input id="username" placeholder="Username" type="text"><br> Pin:<br> <input id="pin" placeholder="123456" type="password"><br> Keep me logged in: <input type="checkbox" checked="true" id="keepLoggedIn"><br> <button class="btn" onclick="loginFromPage()">Login!</button> <div id="err_message"></div> </div></div>';
  showingSignup = false;
  showingLogin = true;
  document.getElementById("username").focus();
}


/* Other, non-main functions */

function loadChat(chat) {
  for (var i = 0; i < chat.length; i++) {
    addChatMessage(chat[i]);
  }
}

function addChatMessage(message) {
  var chatWindow = document.getElementById("chat-window");
  var prefix = {
    title: "[BIRD]",
    color: "#c6c6c6"
  };

  if (message.authority > 0) {
    prefix.title = "[MOD]"
    prefix.color = "#f44b42";
  }
  if (message.authority == 10) {
    prefix.title = "[SERVER]";
    prefix.color = "#ffffff";
  }

  chatWindow.innerHTML += '<div class="chat-message"><span class="prefix" style="color:' + prefix.color + '">' + prefix.title + '</span><span class="chat-username">' + message.username + ':</span><span class="chat-message-only">' + message.message + '</span></div>';


  chatWindow.scrollTop = chatWindow.scrollHeight;

}

socket.on("chat_update", function (message) {
  addChatMessage(message);
})

function sendMessage() {
  var chatMessage = document.getElementById("chat-input").value;
  if (chatMessage == "") return;
  socket.emit("chat", {
    username: readCookie("username"),
    pin: readCookie("pin"),
    message: chatMessage
  });
  document.getElementById("chat-input").style.fontFamily = "";
  document.getElementById("chat-input").value = "";
  clearCommands();
}

var backpackUp = false;

function toggleBackpack() {
  if (backpackUp) {
    clearBackpack();
    backpackUp = false;
  } else {
    overlayBackpack();
    backpackUp = true;
  }
}

function testEase() {
  for (var i = 0; i < 1; i += 0.1) {
    console.log(ease(i).toFixed(1));
  }
}

function ease(distance) {
  var speed = 1;
  if (distance < 0.5) {
    speed *= distance;
  } else {
    speed *= 1 - distance;
  }
  if (speed <= 0) speed = 0.1;
  return speed * 2;
}

function overlayBackpack() {
  socket.emit("req_backpack", account.username);
  document.getElementById("backpack-icon").src = "img/backpack_open.png";
  var backpack = '<div id="backpack" class="noselect"> <img src="img/pet_1.png" id="pet_preview"><img src="img/bird_' + account.skin + '.png" id="bird-preview"><div id="backpack-grid">  </div></div>';

  // TODO Insert inventory <img class="item-preview" src="">
  var petHeight = 50;
  var petProgression = 0;
  window.petAnimationPreview = setInterval(function () {

    /* Pet animation */

    petHeight = (Math.sin(petProgression) * 20) + 50;
    petProgression += 0.12;

    document.getElementById("pet_preview").style.top = petHeight + "px";
  }, 30);

  document.getElementById("backpack-overlay").innerHTML = backpack;

}

socket.on("backpack", function (data) {
  var totalItemsLength = 0;
  for (var i = 0; i < data.inventory.length; i++) {
    if (data.inventory[i] != null) {
      totalItemsLength += Number(data.inventory[i]);
    }
  }
  if (totalItemsLength < 50) totalItemsLength = 50;

  for (var i = 0; i < totalItemsLength; i++) {
    document.getElementById("backpack-grid").innerHTML += '<div class="item-slot" id="backpack_slot_' + i + '"></div>';
  }
  var slot = 0;
  for (var i = 0; i < data.inventory.length; i++) {
    var equipt = false;

    if (data.equipt.indexOf(i + "") != -1) {
      equipt = true;

    }
    if (data.inventory[i] != null) {

      var item = itemsArr[i];
      var amount = data.inventory[i];
      for (var l = 0; l < amount; l++) {
        var checkboxSrc = '/img/backpack-status-unchecked.png';
        if (equipt) {
          checkboxSrc = '/img/backpack-status-checked.png';
          equipt = false;
        }
        var rarityColor = 'rgba(170, 170, 170,0.2)';
        if (item.rarity === 1) {
          rarityColor = 'rgba(173, 173, 173, 1)';
        } else if (item.rarity === 2) {
          rarityColor = '#448e45';
        } else if (item.rarity === 3) {
          rarityColor = '#3a6c99';
        } else if (item.rarity === 4) {
          rarityColor = '#b54148';
        } else if (item.rarity === 5) {
          rarityColor = '#f7c23b';
        }

        document.getElementById('backpack_slot_' + slot).style.background = rarityColor;
        document.getElementById("backpack_slot_" + slot).innerHTML = "<img src='img/" + item.thumbnail + "' class='backpack_slot_image' id='backpack_item_" + i + "' onclick='actionBackpackItem(this.id)'><img src='" + checkboxSrc + "' class='checkbox-backpack'>";
        slot++;
      }
    }
  }
});

function actionBackpackItem(id) {
  id = id.substr(14);
  socket.emit("toggle_item", id);
  clearBackpack();
  overlayBackpack();
}

function clearBackpack() {
  clearTimeout(petAnimationPreview);
  document.getElementById("backpack-icon").src = "img/backpack_closed.png";
  document.getElementById("backpack-overlay").innerHTML = "";
}

var showingNewItem = false;
var unseenItems = [];
socket.on("new_item", function (data) {
  unseenItems.push(data);
  if (!showingNewItem) newItemAnimation(data.item, data.amount);
});

function newItemAnimation(item, amount) {
  showingNewItem = true;
  var itemObj = itemsArr[item];
  document.getElementById("new-item-tag").innerHTML = itemObj.name + "!";


  if (amount > 1) document.getElementById("new-item-tag").innerHTML = amount + "x " + itemObj.name + "!";
  document.getElementById("item-preview-new-item").src = "img/" + itemObj.thumbnail;
  document.getElementById("new-item-background").style.transform = "scale(1)";
}

function clearNewItemAnimation() {
  showingNewItem = false;
  document.getElementById("new-item-background").style.transform = "scale(0)";
  unseenItems.splice(0, 1);
  setTimeout(function () {
      if (unseenItems.length > 0) newItemAnimation(unseenItems[0].item, unseenItems[0].amount);
    },
    100);
}

function chatActive() {
  // Deliver a responsive chat exeprience with command tips when typing.
  var input = document.getElementById("chat-input");
  if (input.value[0] === "/") {
    input.style.fontFamily = "courier";
    getCommands();
  } else {
    input.style.fontFamily = "";
    clearCommands();
  }
}

socket.on("fail", function (message) {
  if (message == "kicked_doublelog") {
    deleteAllCookies();
    location.reload();
  }
})

function getCommands(input) {
  var input = document.getElementById("chat-input");
  document.getElementById("command-tips").innerHTML = '';
  var commands = ["broadcast", "op", "ban", "msg", "give"];
  var added = 0;
  for (var i = 0; i < commands.length; i++) {
    if (commands[i].indexOf(input.value.substr(1, input.value.length)) != -1) {
      document.getElementById("command-tips").innerHTML += '<span id="command-insert">/' + commands[i] + '</span><br>';
      added++;
    }
  }
  var height = 0;
  if (added > 0) height = ((added - 1) * 20 + 60);
  if (height > 200) height = 200;
  document.getElementById("command-tips").setAttribute("style", "height:" + height + "px");

}

function clearCommands() {
  document.getElementById("command-tips").setAttribute("style", "height:0px");
  document.getElementById("command-tips").innerHTML = '';
}



/* Room methods */

function room_01() {
  var hitObjects = [{
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,
    action: "something"
  }];
}







function createCookie(name, value, days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
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
