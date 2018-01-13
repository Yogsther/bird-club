/* All textures, default location is /img and defaulted for src
 * Name of variable will be src name plus texture_ without the file-type extention.
 * splash.png will be a variable called texture_splash
 */

const textures = ["splash.png", "bird_1.png", "bird_2.png", "bird_3.png", "bird_4.png", "tree_01.png",
                 "waypoint.png", "room_1.png", "bird_20.png"];

loadTextures();
loadItemTextures();

function loadTextures() {
  for (var i = 0; i < textures.length; i++) {
    var orgName = textures[i];
    var splitIndex = orgName.indexOf(".");
    if (splitIndex != -1) {
      var varName = orgName.substr(0, splitIndex);
      eval("window.texture_" + varName + " = new Image()"); // Declare variable
      eval("texture_" + varName + ".src = 'img/" + orgName + "'"); // Set src 
    }
  }
  console.log("Loaded " + textures.length + " textures.");
}

function loadItemTextures() {
  for (var i = 0; i < items.length; i++) {
    var orgName = items[i].texture;
    var splitIndex = orgName.indexOf(".");
    if (splitIndex != -1) {
      var varName = orgName.substr(0, splitIndex);
      eval("window.texture_" + varName + " = new Image()"); // Declare variable
      eval("texture_" + varName + ".src = 'img/" + orgName + "'"); // Set src 
    }
  }
  console.log("Loaded " + items.length + " item textures.");
}
