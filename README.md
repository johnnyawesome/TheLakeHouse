# 🏞️🏠TheLakeHouse🏠🏞️
Cute Pixel-Art Nature-Simulation. Herbivores search for apples, predators hunt for prey! Written in [P5JS](https://p5js.org/) using the [P5.Play-Library](https://p5play.org/) and the [Planck Physics Engine](https://piqnt.com/planck.js/).


![TheLakeHouse](https://raw.githubusercontent.com/johnnyawesome/TheLakeHouse/main/TheLakeHouse/DemoImages/TheLakeHouse.gif)

## Copyright & Attribution

**Animals & Tile-Set**: [chien_bleu](https://chien-bleu.itch.io/). License according to [chien_bleu](https://chien-bleu.itch.io/): ["Feel free to use any of those however you want!"](https://chien-bleu.itch.io/forest-animals)

Kudos to [chien_bleu](https://chien-bleu.itch.io/)! Pixel-Art is as much about the retro-flair as it is about minimalism. And [chien_bleu's work](https://chien-bleu.itch.io/forest-animals) is minimalism at it's finest! Every animal is made with a bare-bones, no-nonsense approach and yet they all are immediately recognizeable. Chapeau!🎩

## About the Project

The code is written in [P5JS](https://p5js.org/). It makes use of the [P5.Play-Library](https://p5play.org/).
The [P5.Play-Library](https://p5play.org/) opens up some cool possibilities, because it gives us an easy way to use the [Planck Physics Engine](https://piqnt.com/planck.js/)! Planck is the physics engine used by other popular games, like Angry Birds!

## Initialization

- Generates the background grass-tiles🌱
- Generates the lake🏞️
- Randomly scatters a few stones🪨
- Randomly generates the trees🌳
- Randomly chooses the predators🐺 out of a pool of 5 (Bear🐻, Dog🐶, Fox🦊, Wolf🐺, Snake🐍) and places them randomly on the Map
- Randomly chooses the herbivores🐰 out of a pool of 6 (Mouse🐁, Rabbit🐰, White Rabbit🐰, Stag🦌, Raccoon🦝, Squirrel🐿️) and places them randomly on the Map
- Randomly scatters apples🍎 as food for the herbivores🐰
- Randomly chooses the water-animals out of a pool of 7 (Frog🐸, Turtle🐢, Mallard🦆, White-Black Duck🦆, Brown Duck🦆, White Duck🦆, Grey Duck🦆) and places them on a random spot on the lake
- Builds the lake-house🏠 at the lake
- Drops a chest🎁 next to the lake-house

## Trees🌳

- The trees get generated semi-randomly. There is a check so they don't stand on top of each other
- They also won't get placed inside the Lake
- All trees have a small collider, so that the animals have to walk around them

## Stones🪨

- Stones are placed randomly on the grass
- Stones don't have colliders, they are decorations only

## Food🍎

- The food (Apples🍎) gets randomly placed on the grass
- Once an apple is eaten by a herbivore, a new apple will spawn in a random place, to replace the one eaten
- Food has a small collider. Predators ignore apples🍎 for Food. But predators can collide with the apples and cast them away!

## Prey-Animals🐰

- There are 6 different prey-animals: A Mouse🐁, a Rabbit🐰, a White Rabbit🐰, a Stag🦌, a Raccoon🦝 and a Squirrel🐿️
- All prey-animals will search for food (Apples)
- Each prey-animal will go to a different Apple 🍎, to avoid cluttering the animals
- Once a prey-animal has eaten an apple, it gets a temporary speed-boost!
- If a predator-animal gets too close, the prey-animal will stop searching for food and start avoiding the predator-animal
- If a predator-animal catches a prey-animal, it dies and a new prey-animal is spawned to replace the one that died

## Predator-Animals🐺

- There are 4 different predator-animals: A Snake🐍, a Bear🐻, a Fox🦊, a Wolf🐺 and a Dog🐶
- All pPredator-animals hunt prey-animals
- Each predator-animal will hunt a different prey-animal, to avoid cluttering the predator-animals
- When a predator-animal catches and eats a prey-animal, it too gets a temporary speed-boost!
- This means some predator-animals can become apex predators and go on long continuous feeding-frenzies!

## Water-Animals

- My favorite part of this project! 💙
- Water-Animals don't do much, but they look the cutest, the pixel-art by [chien_bleu](https://chien-bleu.itch.io/) absolutely shines here!
- There are 7 different water-animals: A Frog🐸, a Turtle🐢, a Mallard🦆, a White-Black Duck, a Brown Duck, a White Duck and  Grey Duck
- They spawn in a random place on the lake
- Water-Animals don't do much, they just swim around on the lake

![TheLakeHouse](https://raw.githubusercontent.com/johnnyawesome/TheLakeHouse/main/TheLakeHouse/DemoImages/TheLakeHouse2.gif)
