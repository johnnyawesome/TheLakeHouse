# 🏞️🏠TheLakeHouse🏠🏞️
Cute Pixel-Art Nature-Simulation. Herbivores search for Apples, Predators hunt for Prey! Written in [P5JS](https://p5js.org/) using the [P5.Play-Library](https://p5play.org/) and the [Planck Physics Engine](https://piqnt.com/planck.js/).


![TheLakeHouse](https://raw.githubusercontent.com/johnnyawesome/TheLakeHouse/main/TheLakeHouse/DemoImages/TheLakeHouse.gif)

## Copyright & Attribution

**Animals & Tile-Set**: [chien_bleu](https://chien-bleu.itch.io/). License according to [chien_bleu](https://chien-bleu.itch.io/): ["Feel free to use any of those however you want!"](https://chien-bleu.itch.io/forest-animals)

Kudos to [chien_bleu](https://chien-bleu.itch.io/)! Pixel-Art is as much about the Retro-Flair as it is about Minimalism. And [chien_bleu's work](https://chien-bleu.itch.io/forest-animals) is minimalism at it's finest! Every Animal is made with a bare-bones, no-nonsense approach and yet they all are immediately recognizeable. Chapeau!🎩

## About the Project

The Code is written in [P5JS](https://p5js.org/). It makes use of the [P5.Play-Library](https://p5play.org/).
The [P5.Play-Library](https://p5play.org/) opens up some cool possibilities, because it gives us an easy way to use the [Planck Physics Engine](https://piqnt.com/planck.js/)! This is the Physics Engine used by other popular games, like Angry Birds!

## Initialization

- Generate the Background Grass-Tiles🌱
- Generate the Lake🏞️
- Randomly scatters a few Stones🪨
- Randomly generate the Trees🌳
- Randomly chooses the Predators🐺 out of a Pool of 4 (Bear🐻, Dog🐶, Fox🦊, Wolf🐺) and places them randomly on the Map
- Randomly chooses the Herbivores🐰 out of a Pool of 5 (Mouse🐁, Rabbit🐰, White Rabbit🐰, Stag🦌) and places them randomly on the Map
- Randomly scatters Apples🍎 as Food for the Herbivores🐰
- Randomly chooses the Water-Animals out of a Pool of 7 (Frog🐸, Turtle🐢, Mallard🦆, White-Black Duck🦆, Brown Duck🦆, White Duck🦆, Grey Duck🦆) and places them on a random spot on the Lake
- Builds the Lake-House🏠 at the Lake
- Drops a Chest🎁 next to the Lake-House

## Trees🌳

- The Trees get generated semi-randomly. There is a check so they don't stand on top of each other
- They also won't get placed in the Lake
- Trees have a small Collider, so that the Animals have to walk around them

## Stones🪨

- Stones are placed randomly on the Grass
- Stones don't have Colliders, they are Decorations only

## Food🍎

- The Food (Apples🍎) gets randomly placed on the Grass
- Once Food is eaten, new Food will spawn in a random place, to replace the eaten Food
- Food has a small Collider. Predators ignore Apples🍎 for Food. They can collide with the Apples and cast them away!

## Prey-Animals🐰

- There are 5 different Prey-Animals: A Mouse🐁, a Rabbit🐰, a White Rabbit🐰 and a Stag🦌
- All Prey-Animals will search for Food (Apples)
- Each Prey-Animal will go to a different Apple 🍎, to avoid cluttering the Animals
- Once a Prey-Animal has eaten an Apple, it gets a temporary Speed-Boost!
- If a Predator-Animal gets too close, the Prey-Animal wills top searching for Food and start avoiding the Predator-Animal
- If a Predator-Animal catches a Prey-Animal, it dies and a new Prey-Animal is spawned to replace the one that died

## Predator-Animals🐺

- There are 4 different Predator-Animals: A Bear🐻, a Dog🐶, a Fox🦊 and a Wolf🐺
- All Predator-Animals hunt Prey-Animals
- Each Predator-Animal will hunt a different Prey-Animal, to avoid cluttering the Predator-Animals
- When a Predator-Animal catches and eats a Prey-Animal, it too gets a temporary Speed-Boost!
- This means some Predator-Animals can become Apex Predators and go on long continuous Feeding-Frenzies!

## Water-Animals

- My favorite Part of this Project! 💙
- Water-Animals don't do much, but they look the cutest, the Pixel-Art by [chien_bleu](https://chien-bleu.itch.io/) absolutely shines here!
- There are 7 different Water-Animals: A Frog🐸, a Turtle🐢, a Mallard🦆, a White-Black Duck, a Brown Duck, a White Duck and  Grey Duck
- They Spawn in a random Place on the Lake
- Water-Animals don't do much, they just swim around on the Lake

![TheLakeHouse](https://raw.githubusercontent.com/johnnyawesome/TheLakeHouse/main/TheLakeHouse/DemoImages/TheLakeHouse.gif)
