// All of the logic for the spriting encoder, which is no longer in use because
// I didn't like the image quality it produced

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

// Filter a list of sprites to return the ones that differ more than diffAllowed
function differingSprites(sprites, diffAllowed) {
  assert(sprites.length > 1, 'Expecting at least two items in the sprites list');
  const keepers = [sprites[0]];
  for ( let i = 1; i < sprites.length; i++ ) {
    if ( keepers.every(s => difference2(s, sprites[i]) > diffAllowed) )
      keepers.push(sprites[i]);
  }
  return keepers;
}

// Encode the given image with the given dictionary of sprites
function encode(inputImage, outputImage, diff, width, height, dictionary) {
  assert(width % 8 == 0 && height % 8 == 0, 'Expecting a width and a height divisible by 8');
  assert(dictionary.length > 0, 'Expecting at least one item in the dictionary');
  const encoded = [];
  for ( let y = 0; y < height; y += 8 ) {
    for ( let x = 0; x < width; x += 8 ) {
      const inputSprite = [];
      const outputSprite = [];
      const diffSprite = [];
      for ( let i = 0; i < 8; i++ ) {
        const offset = ((y + i) * width + x) / 8;
        inputSprite.push(inputImage[offset]);
        outputSprite.push(outputImage[offset]);
        diffSprite.push(diff[offset]);
      }
      // Is there something to encode here?
      if ( !diffSprite.every(v => v == 0) ) {
        // Lookup sprite in the dictionary
        const index = similarSprite(diffSprite, dictionary);
        // Does the operation result in a better image than just leaving it
        // alone?
        resultSprite = inputSprite.map((v,i) => v ^ dictionary[index][i]);
        if ( difference2(inputSprite, outputSprite) > difference2(resultSprite, outputSprite) ) {
          encoded.push((x/8 << 4) + y/8);
          encoded.push(index);
        }
      }
    }
  }
  if ( encoded.length == 0 ) return false;
  return [encoded.length / 2, ...encoded];
}

// Decode the image, applied to the base image
function decode(base, width, encoded, dictionary) {
  const decoded = [...base];
  for ( let i = 1; i < encoded[0] * 2; i += 2 ) {
    const x = encoded[i + 0] >> 4;
    const y = (encoded[i + 0] & 0xF) * 8;
    const index = encoded[i + 1];
    for ( dy = 0; dy < 8; dy++ ) {
      decoded[(y + dy) * width / 8 + x] ^= dictionary[index][dy];
    }
  }
  return decoded;
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

// Returns how many pixels are different between two sprites
function difference(spriteA, spriteB) {
  const diff = spriteA.map((v,i) => v ^ spriteB[i]);
  return diff.reduce((a,v) =>
    a + (nibbleLookup[v >> 4] + nibbleLookup[v & 0xF]),
    0
  );
}

// Trying to make a more spacially weighted version, that gives better results
// This code is really repetitive, but it's a minimal viable product 😂
function difference2(spriteA, spriteB) {
  const perfectDiff = spriteA.map((v,i) => v ^ spriteB[i]).reduce((a,v) => a + (nibbleLookup[v >> 4] + nibbleLookup[v & 0xF]), 0) / 64;
  const diffPixels8x8 = Math.abs(spriteA.reduce((a,v) => a + (nibbleLookup[v >> 4] + nibbleLookup[v & 0xF]), 0) - spriteB.reduce((a,v) => a + (nibbleLookup[v >> 4] + nibbleLookup[v & 0xF]), 0)) / 64;

  const diffPixels4x4topleft = Math.abs(spriteA.slice(0,4).reduce((a,v) => a + nibbleLookup[v >> 4], 0) - spriteB.slice(0,4).reduce((a,v) => a + nibbleLookup[v >> 4], 0)) / 16
  const diffPixels4x4topright = Math.abs(spriteA.slice(0,4).reduce((a,v) => a + nibbleLookup[v & 0xF], 0) - spriteB.slice(0,4).reduce((a,v) => a + nibbleLookup[v & 0xF], 0)) / 16
  const diffPixels4x4bottomleft = Math.abs(spriteA.slice(4,8).reduce((a,v) => a + nibbleLookup[v >> 4], 0) - spriteB.slice(4,8).reduce((a,v) => a + nibbleLookup[v >> 4], 0)) / 16
  const diffPixels4x4bottomright = Math.abs(spriteA.slice(4,8).reduce((a,v) => a + nibbleLookup[v & 0xF], 0) - spriteB.slice(4,8).reduce((a,v) => a + nibbleLookup[v & 0xF], 0)) / 16

  const diffPixels3x3sector0 = Math.abs(spriteA.slice(0,3).reduce((a,v) => a + nibbleLookup[v >> 5], 0) - spriteB.slice(0,3).reduce((a,v) => a + nibbleLookup[v >> 5], 0)) / 9
  const diffPixels3x3sector1 = Math.abs(spriteA.slice(0,3).reduce((a,v) => a + nibbleLookup[(v & 24) >> 3], 0) - spriteB.slice(0,3).reduce((a,v) => a + nibbleLookup[(v & 24) >> 3], 0)) / 6
  const diffPixels3x3sector2 = Math.abs(spriteA.slice(0,3).reduce((a,v) => a + nibbleLookup[v & 0x7], 0) - spriteB.slice(0,3).reduce((a,v) => a + nibbleLookup[v & 0x7], 0)) / 9
  const diffPixels3x3sector3 = Math.abs(spriteA.slice(3,5).reduce((a,v) => a + nibbleLookup[v >> 5], 0) - spriteB.slice(3,5).reduce((a,v) => a + nibbleLookup[v >> 5], 0)) / 6
  const diffPixels3x3sector4 = Math.abs(spriteA.slice(3,5).reduce((a,v) => a + nibbleLookup[(v & 24) >> 3], 0) - spriteB.slice(3,5).reduce((a,v) => a + nibbleLookup[(v & 24) >> 3], 0)) / 4
  const diffPixels3x3sector5 = Math.abs(spriteA.slice(3,5).reduce((a,v) => a + nibbleLookup[v & 0x7], 0) - spriteB.slice(3,5).reduce((a,v) => a + nibbleLookup[v & 0x7], 0)) / 6
  const diffPixels3x3sector6 = Math.abs(spriteA.slice(5,8).reduce((a,v) => a + nibbleLookup[v >> 5], 0) - spriteB.slice(5,8).reduce((a,v) => a + nibbleLookup[v >> 5], 0)) / 9
  const diffPixels3x3sector7 = Math.abs(spriteA.slice(5,8).reduce((a,v) => a + nibbleLookup[(v & 24) >> 3], 0) - spriteB.slice(5,8).reduce((a,v) => a + nibbleLookup[(v & 24) >> 3], 0)) / 6
  const diffPixels3x3sector8 = Math.abs(spriteA.slice(5,8).reduce((a,v) => a + nibbleLookup[v & 0x7], 0) - spriteB.slice(5,8).reduce((a,v) => a + nibbleLookup[v & 0x7], 0)) / 9

  const diffPixels2x2sector0 = Math.abs(spriteA.slice(0,2).reduce((a,v) => a + nibbleLookup[v >> 6], 0) - spriteB.slice(0,2).reduce((a,v) => a + nibbleLookup[v >> 6], 0)) / 4
  const diffPixels2x2sector1 = Math.abs(spriteA.slice(0,2).reduce((a,v) => a + nibbleLookup[(v & 48) >> 4], 0) - spriteB.slice(0,2).reduce((a,v) => a + nibbleLookup[(v & 48) >> 4], 0)) / 4
  const diffPixels2x2sector2 = Math.abs(spriteA.slice(0,2).reduce((a,v) => a + nibbleLookup[(v & 12) >> 2], 0) - spriteB.slice(0,2).reduce((a,v) => a + nibbleLookup[(v & 12) >> 2], 0)) / 4
  const diffPixels2x2sector3 = Math.abs(spriteA.slice(0,2).reduce((a,v) => a + nibbleLookup[v & 3], 0) - spriteB.slice(0,2).reduce((a,v) => a + nibbleLookup[v & 3], 0)) / 4

  const diffPixels2x2sector4 = Math.abs(spriteA.slice(2,4).reduce((a,v) => a + nibbleLookup[v >> 6], 0) - spriteB.slice(2,4).reduce((a,v) => a + nibbleLookup[v >> 6], 0)) / 4
  const diffPixels2x2sector5 = Math.abs(spriteA.slice(2,4).reduce((a,v) => a + nibbleLookup[(v & 48) >> 4], 0) - spriteB.slice(2,4).reduce((a,v) => a + nibbleLookup[(v & 48) >> 4], 0)) / 4
  const diffPixels2x2sector6 = Math.abs(spriteA.slice(2,4).reduce((a,v) => a + nibbleLookup[(v & 12) >> 2], 0) - spriteB.slice(2,4).reduce((a,v) => a + nibbleLookup[(v & 12) >> 2], 0)) / 4
  const diffPixels2x2sector7 = Math.abs(spriteA.slice(2,4).reduce((a,v) => a + nibbleLookup[v & 3], 0) - spriteB.slice(2,4).reduce((a,v) => a + nibbleLookup[v & 3], 0)) / 4

  const diffPixels2x2sector8 = Math.abs(spriteA.slice(4,6).reduce((a,v) => a + nibbleLookup[v >> 6], 0) - spriteB.slice(4,6).reduce((a,v) => a + nibbleLookup[v >> 6], 0)) / 4
  const diffPixels2x2sector9 = Math.abs(spriteA.slice(4,6).reduce((a,v) => a + nibbleLookup[(v & 48) >> 4], 0) - spriteB.slice(4,6).reduce((a,v) => a + nibbleLookup[(v & 48) >> 4], 0)) / 4
  const diffPixels2x2sector10 = Math.abs(spriteA.slice(4,6).reduce((a,v) => a + nibbleLookup[(v & 12) >> 2], 0) - spriteB.slice(4,6).reduce((a,v) => a + nibbleLookup[(v & 12) >> 2], 0)) / 4
  const diffPixels2x2sector11 = Math.abs(spriteA.slice(4,6).reduce((a,v) => a + nibbleLookup[v & 3], 0) - spriteB.slice(4,6).reduce((a,v) => a + nibbleLookup[v & 3], 0)) / 4

  const diffPixels2x2sector12 = Math.abs(spriteA.slice(6,8).reduce((a,v) => a + nibbleLookup[v >> 6], 0) - spriteB.slice(6,8).reduce((a,v) => a + nibbleLookup[v >> 6], 0)) / 4
  const diffPixels2x2sector13 = Math.abs(spriteA.slice(6,8).reduce((a,v) => a + nibbleLookup[(v & 48) >> 4], 0) - spriteB.slice(6,8).reduce((a,v) => a + nibbleLookup[(v & 48) >> 4], 0)) / 4
  const diffPixels2x2sector14 = Math.abs(spriteA.slice(6,8).reduce((a,v) => a + nibbleLookup[(v & 12) >> 2], 0) - spriteB.slice(6,8).reduce((a,v) => a + nibbleLookup[(v & 12) >> 2], 0)) / 4
  const diffPixels2x2sector15 = Math.abs(spriteA.slice(6,8).reduce((a,v) => a + nibbleLookup[v & 3], 0) - spriteB.slice(6,8).reduce((a,v) => a + nibbleLookup[v & 3], 0)) / 4

  const average = (
    perfectDiff +
    diffPixels8x8 +

    diffPixels4x4topleft + diffPixels4x4topright +
    diffPixels4x4bottomleft + diffPixels4x4bottomright +

    diffPixels3x3sector0 + diffPixels3x3sector1 + diffPixels3x3sector2 +
    diffPixels3x3sector3 + diffPixels3x3sector4 + diffPixels3x3sector5 +
    diffPixels3x3sector6 + diffPixels3x3sector7 + diffPixels3x3sector8 +

    diffPixels2x2sector0 + diffPixels2x2sector1 + diffPixels2x2sector2 + diffPixels2x2sector3 +
    diffPixels2x2sector4 + diffPixels2x2sector5 + diffPixels2x2sector6 + diffPixels2x2sector7 +
    diffPixels2x2sector8 + diffPixels2x2sector9 + diffPixels2x2sector10 + diffPixels2x2sector11 +
    diffPixels2x2sector12 + diffPixels2x2sector13 + diffPixels2x2sector14 + diffPixels2x2sector15
  ) / 31;

  return average;
}

// Helper function to visualize a sprite
function renderSprite(sprite) {
  return '⌜                  ⌝\n' +
           sprite.map(v =>
             '  ' +
             v.toString(2)
              .padStart(8, '0')
              .replaceAll('0', '  ')
              .replaceAll('1', '██') +
             '  '
           ).join('\n') +
       '\n⌞                  ⌟';
}

function renderRow(sprites) {
  const strings = sprites.map(s => renderSprite(s).split('\n'));
  let row = '';
  for ( let i = 0; i < 10; i++ ) {
    row += strings.map(s => s[i]).join('  ') + '\n';
  }
  return row;
}

// Helper function to visualize multiple sprites
function renderSprites(sprites) {
  const spritesPerRow = 7;
  let result = '';
  for (let i = 0; i < sprites.length; i += spritesPerRow) {
      result += renderRow(sprites.slice(i, i + spritesPerRow)) + '\n';
  }
  return result;
}

module.exports = {
  chopUp,
  uniqueSprites,
  nonEmpty,
  similarity,
  difference,
  difference2,
  differingSprites,
  encode,
  decode,
  similarSprite,
  renderSprite,
  renderSprites
};
