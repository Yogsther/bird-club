const items = [
  {
    index: 1,
    name: "Red Bird Pet",
    thumbnail: "pet_1.png",
    texture: "pet_1.png",
    rarity: 1,
    type: "pet"
  }, {
    index: 2,
    name: "Evil Bird",
    thumbnail: "bird_20.png",
    texture: "bird_20.png",
    rarity: 4,
    type: "skin"
  }
];

var itemsArr = new Array();

for (var i = 0; i < items.length; i++) {
  var item = items[i];
  itemsArr[item.index] = items[i];
}

/*

When accessing an Item, user itemsArr[ITEM_ID].

*/
