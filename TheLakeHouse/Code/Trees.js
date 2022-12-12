//Generate Trees
function generateTrees() {

  //Plant Trees in upper 2/3 of the Map 
  for (let i = edgeDistance; i <= width - edgeDistance; i += 5) {
    for (let j = edgeDistance; j <= (height / 3) * 2 - edgeDistance; j += 5) {

      plantTrees(i, j)
    }
  }
  //Plant Trees in lower 1/3 of the Map 
  for (let i = edgeDistance; i <= width / 2 - edgeDistance * 2; i += 5) {
    for (let j = (height / 3) * 2 - edgeDistance; j < height - edgeDistance; j += 5) {

      plantTrees(i, j)
    }
  }
}

//PlantTrees
function plantTrees(i, j) {

  //Find close Trees
  let neighborDistance = 99999999;
  for (const tree of trees) {
    let currentTreeDist = dist(i, j, tree.x, tree.y);
    if (currentTreeDist < neighborDistance) neighborDistance = currentTreeDist;
  }

  //Plant Tree if it has enough space
  if (neighborDistance > 25
    && random(0, 10) > 9) {
    new trees.Sprite(i, j, 10);
    trees[trees.length - 1].friction = 0.1;
  }
}