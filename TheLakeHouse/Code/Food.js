//Generate Trees
function handleFood() {

  spawnFood();
  ageFood();

}

//Spawn Food
function spawnFood() {

  if (food.length < numberOfFood) {

    //Spawn Food in upper 2/3 of the Map 
    new food.Sprite(round(random(edgeDistance, width - edgeDistance)), round(random(edgeDistance, (height / 3) * 2 - edgeDistance)), 3);
    food[food.length - 1].reserved = null;

    //Spawn (less) Food in lower 1/3 of the Map
    if (random(0, 10) > 9) {
      new food.Sprite(round(random(edgeDistance, width / 2 - edgeDistance)), round(random((height / 3) * 2 - edgeDistance, height - edgeDistance)), 3);
      food[food.length - 1].reserved = null;
    }
  }
}

//Food perishes over Time
function ageFood() {
  for (const f of food) {
    if (frameCount % 30 === 0) f.age++;
    if (f.age >= 60) f.remove();
  }
}