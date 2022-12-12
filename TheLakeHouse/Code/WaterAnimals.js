function handleWaterAnimals() {

  generateWaterAnimals();
  waterAnimalRoam();
  waterAnimalLookDirection();
}

function generateWaterAnimals() {

  if (waterAnimals.length >= numberOfWaterAnimals) return;

  //New Sprite
  new waterAnimals.Sprite(round(random(width / 2 + edgeDistance, width - edgeDistance)), round(random((height / 3) * 2 + edgeDistance, height - edgeDistance)), animalCollisionBoxDiameter);
  //Random Animal-Sprite
  waterAnimals[waterAnimals.length - 1].ani = random(["Frog", "Turtle", "Duck", "WhiteBlackDuck", "BrownDuck", "WhiteDuck", "GreyDuck"]);
  //Frame-Delay for smoother Animation
  waterAnimals[waterAnimals.length - 1].ani.frameDelay = animalFrameDelay;
  //Reduced Friction
  waterAnimals[waterAnimals.length - 1].friction = 0.1;
}

//Orient the Sprite left or right, depending on the Walking-Direction
function waterAnimalLookDirection() {
  for (const animal of waterAnimals) animal.mirror.x = (animal.velocity.x >= 0) ? true : false;
}

function waterAnimalRoam() {

  if (frameCount % 300 === 0) for (const waterAnimal of waterAnimals) setTimeout(() => waterAnimal.moveTo(round(random(width / 2, width)), round(random((height / 3) * 2, height)), 0.1), random(2000, 15000));
}