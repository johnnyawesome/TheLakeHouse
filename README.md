# 🏞️🏠TheLakeHouse🏠🏞️
Cute Pixel-Art Nature-Simulation. Herbivores search for Apples, Predators hunt for Prey! Written in P5JS.



![TheLakeHouse](https://raw.githubusercontent.com/johnnyawesome/TheLakeHouse/main/TheLakeHouse/DemoImages/TheLakeHouse.gif)

## Copyright & Attribution

**Animals & Tile-Set**: [chien_bleu](https://chien-bleu.itch.io/) License according to chien_bleu: ["Feel free to use any of those however you want!"](https://chien-bleu.itch.io/forest-animals)

## About the Project

The Code is written in [P5JS](https://p5js.org/). It makes use of the [P5.Play-Library](https://p5play.org/).
The [P5.Play-Library](https://p5play.org/) opens up some cool possibilities, because it gives us an easy way to use the [Planck Physics Engine](https://piqnt.com/planck.js/)! This is the Physics Engine used by other popular games, like Angry Birds!

## Initialization

- Generate the Background Grass-Tiles🌱
- Generate the Lake🏞️
- Randomly scatters a few Stones🪨
- Randomly generate the Trees🌳.
- Randomly chooses the Predators🐺 out of a Pool of 4 (Bear🐻, Dog🐶, Fox🦊, Wolf🐺) and places them randomly on the Map
- Randomly chooses the Herbivores🐰 out of a Pool of 5 (Mouse🐁, Rabbit🐰, White Rabbit🐰, Stag🦌) and places them randomly on the Map
- Randomly scatters Apples🍎 as Food for the Herbivores🐰
- Randomly chooses the Water-Animals out of a Pool of 7 (Frog🐸, Turtle🐢, Mallard🦆, White-Black Duck🦆, Brown Duck🦆, White Duck🦆, Grey Duck🦆) and places them on a random spot on the Lake
- Builds the Lake-House🏠 at the Lake
- Drops a Chest🎁 next to the Lake-House

## 🌳Trees

- The Trees get generated semi-randomly. There is a check so they don't stand on top of each other
- Trees have a small Collider, so that the Animals have to walk around them

## 🍎Food

- 
