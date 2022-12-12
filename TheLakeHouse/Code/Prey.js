function handlePrey() {

  generatePrey();
  preySpeedBoostReduction();
  roam();
  preyLookDirection();
}

function generatePrey() {

  if (prey.length >= numberOfPrey) return;

  //New Sprite
  new prey.Sprite(round(random(edgeDistance, width - edgeDistance)), round(random(edgeDistance, (height / 3) * 2 - edgeDistance)), animalCollisionBoxDiameter);
  //Random Animal-Sprite
  prey[prey.length - 1].ani = random(["Mouse", "Rabbit", "WhiteRabbit", "Squirrel", "Stag", "Raccoon"]);
  //Frame-Delay for smoother Animation
  prey[prey.length - 1].ani.frameDelay = animalFrameDelay;
  //Reduced Friction for Tree-Collisions
  prey[prey.length - 1].friction = 0.1;
  //Predator-Reservation
  prey[prey.length - 1].reserved = null;
  //Flight-Boost
  prey[prey.length - 1].speedBoost = 0.013;
}

//Roam around the Map
function roam() {

  //If a Predator is close, avoid it
  for (const preyAnimal of prey) {
    for (const predator of predators) {
      if (dist(preyAnimal.x, preyAnimal.y, predator.x, predator.y) <= 15) {
        preyAnimal.moveAway(predator, preyAnimal.speedBoost);
        return;
      }
    }
  }

  //Don't choose new Destinations too often! Results in choppy movement!
  if (frameCount % 20 === 0) {

    //If no predator is close, find Food
    for (const preyAnimal of prey) preyAnimal.moveTo(findAndReserveClosestFood(preyAnimal), 0.2);

  }
}

//Find and reserve Food
function findAndReserveClosestFood(preyAnimal) {

  //If there is reserved food already, return it
  for (const f of food) if (f.reserved && f.reserved === preyAnimal.name) return f;

  //Finds closest, non-reserved Food
  let closestFood = food.reduce((last, current) => {
    if (dist(preyAnimal.x, preyAnimal.y, current.x, current.y) < dist(preyAnimal.x, preyAnimal.y, last.x, last.y)
      && (!current.reserved || current.reserved === preyAnimal.name)) {
      return current;
    } else {
      return last;
    }
  });

  //Reserves food
  closestFood.reserved = preyAnimal.name;
  return closestFood;
}

//Orient the Sprite left or right, depending on the Walking-Direction
function preyLookDirection() {
  for (const preyAnimal of prey) preyAnimal.mirror.x = (preyAnimal.velocity.x >= 0) ? true : false;
}

//Slowly reduce the Speed-Boost from eating Food
function preySpeedBoostReduction() {
  if (frameCount % 50 === 0) for (const preyAnimal of prey) if (preyAnimal.speedBoost > 0.013) preyAnimal.speedBoost -= 0.001;
}




