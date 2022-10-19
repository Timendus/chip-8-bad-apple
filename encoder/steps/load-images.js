const fs = require('fs');
const PNG = require('pngjs').PNG;

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    path: "frames/scaled/bad_apple_{id}.png",
    id: i => i < 1000 ? String(i).padStart(3, '0') : i,
    start: 1,
    end: 6562,
    step: 2
  }, options);

  // Load all requested files
  for ( let i = options.start; i < options.end; i += options.step ) {
    const id = options.id(i);
    const file = options.path.replace('{id}', id);
    const fileData = fs.readFileSync(file);
    const png = PNG.sync.read(fileData);
    const input = reduceTo1Bit(png);
    movie.push({ id, input });
  }
}

// Takes the input image (RGBA data, pre-scaled to the frame dimensions) and
// converts it to one bit per pixel black and white.
function reduceTo1Bit({width, height, data}) {
  const reducedData = [];
  for ( let y = 0; y < height; y++ ) {
    for ( let x = 0; x < width / 8; x++ ) {
      let byte = 0;
      for ( let i = 0; i < 8; i++ ) {
        byte <<= 1;
        const offset = y * width * 4 + (x*8+i) * 4;
        if ( data[offset] > 128 ) byte |= 1;
      }
      reducedData.push(byte);
    }
  }
  return reducedData;
}
