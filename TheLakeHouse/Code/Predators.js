function handlePredators() {

  generatePredators();
  predatorSpeedBoostReduction();
  hunt();
  predatorLookDirection();
}

//Spawn all Predators
function generatePredators() {

  if (predators.length >= numberOfPredators) return;


  //Generate one Predator of each kind 
  for (const predator of ["Bear", "Dog", "Fox", "Wolf", "Snake"]) {

    if (predators.length >= numberOfPredators) return;

    //New Sprite
    new predators.Sprite(round(random(edgeDistance, width - edgeDistance)), round(random(edgeDistance, (height / 3) * 2 - edgeDistance)), animalCollisionBoxDiameter);
    //Sprite-Properties
    predators[predators.length - 1].ani = predator;
    //Reduced Friction for Tree-Collisions
    predators[predators.length - 1].friction = 0.1;
    //Frame-Delay for smoother Animation
    predators[predators.length - 1].ani.frameDelay = animalFrameDelay;
    //Hunting-Boost
    predators[predators.length - 1].speedBoost = 0.2;
  }
}

//Hunt Prey
function hunt() {

  //Don't choose new Destinations too often! Results in choppy movement!
  if (frameCount % 50 === 0) for (const predator of predators) predator.moveTo(findAndReserveClosestPrey(predator), predator.speedBoost);
}

//Find and reserve Prey
function findAndReserveClosestPrey(predator) {

  //If there is reserved Prey already, return it
  for (const p of prey) if (p.reserved && p.reserved === predator.name) return p;

  //Finds closest, non-reserved Prey
  let closestPrey = prey.reduce((last, current) => {
    if (dist(predator.x, predator.y, current.x, current.y) < dist(predator.x, predator.y, last.x, last.y)
      && !current.reserved) {
      return current;
    } else {
      return last;
    }
  });

  //Reserves Prey
  closestPrey.reserved = predator.name;
  return closestPrey;

}

//Orient the Sprite left or right, depending on the Walking-Direction
function predatorLookDirection() {
  for (const predator of predators) predator.mirror.x = (predator.velocity.x >= 0) ? true : false;
}

//Slowly reduce the Speed-Boost from eating Prey
function predatorSpeedBoostReduction() {
  if (frameCount % 30 === 0) for (const predator of predators) if (predator.speedBoost > 0.2) predator.speedBoost -= 0.01;
}