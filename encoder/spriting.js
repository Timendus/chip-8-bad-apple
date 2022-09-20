function assert(condition, message) {
  if (!condition) throw `Assertion failed: ${message}`;
}

const nibbleLookup = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

// Chops up an image into a list of 8x8 sprites
function chopUp(image, width, height) {
  assert(width % 8 == 0 && height % 8 == 0, 'Expecting a width and a height divisible by 8');
  const sprites = [];
  for ( let y = 0; y < height; y += 8 ) {
    for ( let x = 0; x < width; x += 8 ) {
      const sprite = [];
      for ( let i = 0; i < 8; i++ ) {
        const offset = ((y + i) * width + x) / 8;
        sprite.push(image[offset]);
      }
      sprites.push(sprite);
    }
  }
  return sprites;
}

// Filters a list of sprites to return the unique ones
function uniqueSprites(sprites) {
  return Array.from(
    new Set(sprites.map(JSON.stringify)),
    JSON.parse
  );
}

// Remove the empty sprites (all zeroes)
function nonEmpty(sprites) {
  return sprites.filter(sprite => !sprite.every(v => v == 0));
}

// Filter a list of sprites to return the ones that differ more than pixelsDiff
function differingSprites(sprites, pixelsDiff) {
  assert(sprites.length > 1, 'Expecting at least two items in the sprites list');
  const keepers = [sprites[0]];
  for ( let i = 1; i < sprites.length; i++ ) {
    if ( keepers.every(s => difference(s, sprites[i]) > pixelsDiff) )
      keepers.push(sprites[i]);
  }
  return keepers;
}

// Encode the given image with the given dictionary of sprites
function encode(image, width, height, dictionary) {
  assert(width % 8 == 0 && height % 8 == 0, 'Expecting a width and a height divisible by 8');
  assert(dictionary.length > 0, 'Expecting at least one item in the dictionary');
  const encoded = [];
  for ( let y = 0; y < height; y += 8 ) {
    for ( let x = 0; x < width; x += 8 ) {
      const sprite = [];
      for ( let i = 0; i < 8; i++ ) {
        const offset = ((y + i) * width + x) / 8;
        sprite.push(image[offset]);
      }
      // Is there something to encode here?
      if ( !sprite.every(v => v == 0) ) {
        // Lookup sprite in the dictionary
        const index = similarSprite(sprite, dictionary);
        encoded.push((x/8 << 4) + y/8);
        encoded.push(index);
      }
    }
  }
  return encoded;
}

// Get the index of a sprite that is as similar as possible from the given
// dictionary
function similarSprite(sprite, dictionary) {
  let index = 0;
  let smallestDiff = Infinity;
  for ( let i = 0; i < dictionary.length; i++ ) {
    const diff = difference(sprite, dictionary[i]);
    if ( diff < smallestDiff ) {
      smallestDiff = diff;
      index = i;
    }
  }
  return index;
}

// Returns how many pixels are the same between two sprites
function similarity(spriteA, spriteB) {
  return 64 - difference(spriteA, spriteB);
}

function difference(spriteA, spriteB) {
  const diff = spriteA.map((v,i) => v ^ spriteB[i]);
  return diff.reduce((a,v) =>
    a + (nibbleLookup[v >> 4] + nibbleLookup[v & 0xF]),
    0
  );
}

// Helper function to visualize a sprite
function renderSprite(sprite) {
  return '⌜                  ⌝\n' +
           sprite.map(v =>
             '  ' +
             v.toString(2)
              .padStart(8, '0')
              .replaceAll('0', '  ')
              .replaceAll('1', '██')
           ).join('\n') +
       '\n⌞                  ⌟';
}

// Helper function to visualize multiple sprites
function renderSprites(sprites) {
  return sprites.map(s => renderSprite(s)).join('\n');
}

module.exports = {
  chopUp,
  uniqueSprites,
  nonEmpty,
  similarity,
  difference,
  differingSprites,
  encode,
  similarSprite,
  renderSprite,
  renderSprites
};
