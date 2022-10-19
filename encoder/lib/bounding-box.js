const { assert } = require('./helpers.js');

// Get the bounding box of actual data for this image, horizontally aligned to 8
// pixels
function encode(image, width) {
  const height = image.length / (width / 8);
  let minX = minY = 0;
  let maxX = width / 8;
  let maxY = height - 1;

  while ( minY < maxY && image.slice(minY * width / 8, minY * width / 8 + width / 8)
                              .every(v => v == 0) ) minY += 1;
  while ( maxY > minY && image.slice(maxY * width / 8, maxY * width / 8 + width / 8)
                              .every(v => v == 0) ) maxY -= 1;

  while ( minX < maxX && image.filter((v, i) => i % (width / 8) == minX)
                              .every(v => v == 0) ) minX += 1;
  while ( maxX > minX && image.filter((v, i) => i % (width / 8) == maxX)
                              .every(v => v == 0) ) maxX -= 1;

  const slice = [];
  for ( let y = minY; y <= maxY; y++ ) {
    for ( let x = minX; x <= maxX; x++ ) {
      slice.push(image[y * width / 8 + x]);
    }
  }

  assert((maxX - minX + 1) * (maxY - minY + 1) == slice.length, `slice contains the right number of bytes`);
  assert((minX & 7) == minX, `minX can be encoded in 3 bits (got: ${minX})`);
  assert((maxX & 7) == maxX, `maxX can be encoded in 3 bits (got: ${maxX})`);
  assert((minY & 31) == minY, `minY can be encoded in 5 bits (got: ${minY})`);
  assert((maxY & 31) == maxY, `maxY can be encoded in 5 bits (got: ${maxY})`);

  return [(minX << 5) + minY, (maxX << 5) + maxY, ...slice];
}

function decode(background, data, width, xor = false) {
  const height = background.length / (width / 8);
  const minX = data[0] >> 5;
  const maxX = data[1] >> 5;
  const minY = (data[0] & 0x1F);
  const maxY = (data[1] & 0x1F);
  data = data.slice(2);

  const result = [];
  for ( let y = 0; y < height; y++ ) {
    for ( let x = 0; x < width / 8; x++ ) {
      if ( x >= minX && x <= maxX && y >= minY && y <= maxY )
        if ( xor )
          result.push((background[y * (width / 8) + x] || 0) ^ data[(y - minY) * (maxX - minX + 1) + (x - minX)]);
        else
          result.push(data[(y - minY) * (maxX - minX + 1) + (x - minX)]);
      else
        result.push(background[y * (width / 8) + x] || 0);
    }
  }
  return result;
}

module.exports = {
  encode, decode
};
