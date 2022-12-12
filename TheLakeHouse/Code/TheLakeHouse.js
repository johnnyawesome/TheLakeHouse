/// <reference path="../TSDef/p5.global-mode.d.ts" />

"use strict";

//Animals
let prey, predators, waterAnimals;

//World
let grass, water, shore, trees, food;

//Props
let house, chest, stones;

//Constants
const numberOfPredators = 5;
const numberOfPrey = numberOfPredators * 2;
const numberOfFood = numberOfPrey * 3;
const numberOfWaterAnimals = 6;
const animalFrameDelay = 15;
const edgeDistance = 15;
const animalCollisionBoxDiameter = 5;


function preload() {

  //############ Predators ############
  //Predator Sprites
  predators = new Group();
  //Prey Animations
  predators.addAni("Bear", '../Sprites/PixelAnimals/Bear1.png', 2);
  predators.addAni("Dog", '../Sprites/PixelAnimals/Dog1.png', 2);
  predators.addAni("Fox", '../Sprites/PixelAnimals/Fox1.png', 2);
  predators.addAni("Wolf", '../Sprites/PixelAnimals/Wolf1.png', 2);
  predators.rotationLock = true;
  //Custom Properties
  //Name of the Prey (Used for Food-Reservations)
  predators.name = () => Math.random().toString(36).substring(2, 7);

  //############ Prey ############
  //Prey Sprites
  prey = new Group();
  //Prey Animations
  prey.addAni("Mouse", '../Sprites/PixelAnimals/Mouse1.png', 2);
  prey.addAni("Rabbit", '../Sprites/PixelAnimals/Rabbit1.png', 2);
  prey.addAni("WhiteRabbit", '../Sprites/PixelAnimals/WhiteRabbit1.png', 2);
  //prey.addAni("Racoon", '../Sprites/PixelAnimals/Racoon1.png', 2);
  prey.addAni("Squirrel", '../Sprites/PixelAnimals/Squirrel1.png', 2);
  prey.addAni("Stag", '../Sprites/PixelAnimals/Stag1.png', 2);
  //Prey Settings
  prey.rotationLock = true;
  prey.directionOff = () => random(0, 100);
  //If Predator overlaps Prey...
  prey.overlaps(predators, (prey, predator) => {
    prey.remove(); //...remove the Prey...
    predator.speedBoost = 0.4//...and give a Speed-Boost
  });
  prey.debug = false;
  //Custom Properties
  //Name of the Prey (Used for Food-Reservations)
  prey.name = () => Math.random().toString(36).substring(2, 7);

  //############ Water Animals ############
  //Water Animals
  waterAnimals = new Group();
  waterAnimals.addAni("Frog", '../Sprites/PixelAnimals/Frog1.png', 2);
  waterAnimals.addAni("Turtle", '../Sprites/PixelAnimals/Turtle1.png', 2);
  waterAnimals.addAni("Duck", '../Sprites/PixelAnimals/Duck1.png', 2);
  waterAnimals.addAni("WhiteBlackDuck", '../Sprites/PixelAnimals/WhiteBlackDuck1.png', 2);
  waterAnimals.addAni("BrownDuck", '../Sprites/PixelAnimals/BrownDuck1.png', 2);
  waterAnimals.addAni("WhiteDuck", '../Sprites/PixelAnimals/WhiteDuck1.png', 2);
  waterAnimals.addAni("GreyDuck", '../Sprites/PixelAnimals/GreyDuck1.png', 2);
  waterAnimals.rotationLock = true;

  //############ Grass ############
  //Grass Sprites
  grass = new Group();
  grass.addImg('Grass', '../Sprites/Tileset/Grass1.png');
  grass.collider = 'none';
  grass.layer = 1;

  //############ Water ############
  //Water Sprite
  water = new Group();
  water.addImg('Grass', '../Sprites/Tileset/LakeNoBorders.png');
  water.collider = 'none';
  water.layer = 1;

  //############ Shore ############
  //Shore Sprites
  shore = new Group();
  shore.layer = 0;

  //############ Stones ############
  //Stone Sprites
  stones = new Group();
  stones.addImg('Stone', '../Sprites/Props/Stone.png');

  //############ Trees ############
  //Tree Sprites
  trees = new Group();
  trees.addImg('Tree', '../Sprites/Props/TreeMerged.png');
  trees.collider = 'static';
  trees.debug = false;

  //############ Food ############
  //Food Sprite
  food = new Group();
  food.addImg('Food', '../Sprites/Props/Apple.png');
  //If Prey overlaps Food...
  prey.overlaps(food, (prey, food) => {
    food.remove(); //...remove the Food...
    prey.speedBoost = 0.03; //...and give a Speed-Boost
  });
  //Custom Properties
  food.age = 0;
  food.debug = false;

}

function setup() {

  //New Canvas with Pixel-Art Renderer
  createCanvas(400, 400, 'pixelated');

  //Generate Grass-Tiles
  for (let i = 0; i <= width; i += 16) for (let j = 0; j <= height; j += 16) new grass.Sprite(i, j);

  //Generate Water
  for (let i = width / 2; i <= width; i += 16) for (let j = (height / 3) * 2 + 10; j <= height; j += 15) new water.Sprite(i, j);

  //Generate Stones

  //Collider between Water and Grass
  new shore.Sprite(295, (height / 3) * 2 + 3, 210, 1, "static");
  new shore.Sprite(width / 2 - 8, (height / 3) * 2.5, 1, 130, "static");

  //Generate Stones
  generateStones();

  //Generate Trees
  generateTrees();

  //Build the Lakehouse 
  house = new Sprite(width / 2 - edgeDistance, height / 6 * 5, 16, 16, "static");
  house.addImg('House', '../Sprites/Props/HouseMerged.png');

  //Chest
  chest = new Sprite(width / 2 - edgeDistance, height / 6 * 5.3, 16, 16, "static");
  chest.addImg('Chest', '../Sprites/Props/Chest.png');

}

function draw() {
  clear();

  handlePredators();
  handlePrey();
  handleFood();
  handleWaterAnimals();
}