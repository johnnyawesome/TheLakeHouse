
//Generate Stones
function generateStones() {

  //Plant Stones in upper 2/3 of the Map 
  for (let i = edgeDistance; i <= width - edgeDistance; i += 10) {
    for (let j = edgeDistance; j <= (height / 3) * 2 - edgeDistance; j += 10) {

      plantStones(i, j)
    }
  }
  //Plant Stones in lower 1/3 of the Map 
  for (let i = edgeDistance; i <= width / 2 - edgeDistance * 2; i += 25) {
    for (let j = (height / 3) * 2 - edgeDistance; j < height - edgeDistance; j += 25) {

      plantStones(i, j)
    }
  }
}

//PlantStones
function plantStones(i, j) {

  //Plant Stone if it has enough space
  if (random(0, 1000) > 990) new stones.Sprite(i, j, 16, 16, "none");

}