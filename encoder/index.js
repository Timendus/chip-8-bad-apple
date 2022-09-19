#!/usr/bin/env node

const fs = require('fs');
const PNG = require('pngjs').PNG;
const rleEncode = require('./rle.js');

const FRAME_START   = 1;
const FRAME_END     = 1400;
const FRAME_STEP    = 2;
const TARGET_WIDTH  = 48;   // Should be divisible by 8
const TARGET_HEIGHT = 32;

const NUM_PIXELS_CONSIDERED_NO_CHANGE = 0;

const movie = {}

for ( let i = FRAME_START; i <= FRAME_END; i+=FRAME_STEP ) {
  const id = i < 1000 ? String(i).padStart(3, '0') : i;
  const file = `frames/scaled/bad_apple_${id}.png`;
  const fileData = fs.readFileSync(file);
  const png = PNG.sync.read(fileData);
  movie[i] = {
    id,
    input: reduceTo1Bit(png.data),
    frames: 1
  };
}

const nibbleLookup = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
let prev = false;
for ( const frame of Object.keys(movie) ) {
  movie[frame].RLE = rleEncode(movie[frame].input);
  movie[frame].outputType = movie[frame].input.length > movie[frame].RLE.length ? 'RLE' : 'input';
  if ( frame > FRAME_START ) {
    movie[frame].diff = movie[frame].input.map((v, i) => v ^ movie[prev].input[i]);
    movie[frame].diffRLE = rleEncode(movie[frame].diff);
    movie[frame].numChangedPixels = movie[frame].diff.reduce((a,v) => v == 0 ? a : a + (nibbleLookup[v >> 4] + nibbleLookup[v & 0xF]), 0);
    movie[frame].duplicate = movie[frame].numChangedPixels <= NUM_PIXELS_CONSIDERED_NO_CHANGE;
    if ( movie[frame].diffRLE.length < movie[frame][movie[frame].outputType].length )
      movie[frame].outputType = 'diffRLE';
  }
  movie[frame].output = movie[frame][movie[frame].outputType];
  if ( prev && movie[frame].duplicate ) {
    movie[prev].frames++;
    if ( movie[prev].frames > 31 ) console.error("Can't merge so many frames :/");
  } else {
    prev = frame;
  }
}

render(movie[Object.keys(movie).pop()].input);

fs.writeFileSync('player/frames.8o',
  '#data\n\n' +
  Object.values(movie)
        .filter(v => !v.duplicate)
        .map(v => {
          const clearBeforeDraw = v.outputType == 'RLE' || v.outputType == 'input';
          const rleEncoded = v.outputType != 'input';
          return `: bad_apple_${v.id} # ${v.outputType}\n` +
            '  0x' + ((clearBeforeDraw ? 128 : 0) + (rleEncoded ? 64 : 0) + (v.frames - 1)).toString(16).padStart(2, '0') + '\n' +
            formatForOcto(v.output)
        })
        .join('\n')
);

console.log(`\nRENDERED ${Object.keys(movie).length} FRAMES\n`)

const input = Object.values(movie).reduce((a, v) => a + v.input.length, 0);
const rle = Object.values(movie).filter(v => !v.duplicate).reduce((a, v) => a + v.RLE.length, 0);
const diffrle = Object.values(movie).filter(v => !v.duplicate).reduce((a, v) => a + (v.diffRLE ? v.diffRLE.length : v.RLE.length), 0);
const output = Object.values(movie).filter(v => !v.duplicate).reduce((a, v) => a + v[v.outputType].length, 0);
console.log(`${input} bytes uncompressed`);
console.log(`${rle} bytes RLE encoded (${Math.round((input-rle)/input*1000)/10}% compression rate)`);
console.log(`${diffrle} bytes RLE encoded over the diff (${Math.round((input-diffrle)/input*1000)/10}% compression rate)`);
console.log(`${output} bytes for the chosen output (${Math.round((input-output)/input*1000)/10}% compression rate)`);

console.log(`\nExtrapolated to 6562 frames, this would be ${Math.ceil(output/(FRAME_END-FRAME_START+1)*6562)} bytes (or ${Math.ceil(output/(FRAME_END-FRAME_START+1)*6562/2)} bytes for half the FPS)`)

// Takes the input image (RGBA data) and scales it to the target width and
// height, with one bit per pixel black and white.
function scaleAndReduce(image, width, height) {
  const data = [];
  for ( let y = 0; y < TARGET_HEIGHT; y++ ) {
    const scaled_y = Math.floor(y / TARGET_HEIGHT * height);
    for ( let x = 0; x < TARGET_WIDTH / 8; x++ ) {
      let byte = 0;
      for ( let i = 0; i < 8; i++ ) {
        byte <<= 1;
        const scaled_x = Math.floor((8*x+i) / TARGET_WIDTH * width);
        const offset = scaled_y * width * 4 + scaled_x * 4;
        if ( image[offset] > 128 ) byte |= 1;
      }
      data.push(byte);
    }
  }
  return data;
}

// Takes the input image (RGBA data, pre-scaled to the frame dimensions) and
// converts it to one bit per pixel black and white.
function reduceTo1Bit(image) {
  const data = [];
  for ( let y = 0; y < TARGET_HEIGHT; y++ ) {
    for ( let x = 0; x < TARGET_WIDTH / 8; x++ ) {
      let byte = 0;
      for ( let i = 0; i < 8; i++ ) {
        byte <<= 1;
        const offset = y * TARGET_WIDTH * 4 + (x*8+i) * 4;
        if ( image[offset] > 128 ) byte |= 1;
      }
      data.push(byte);
    }
  }
  return data;
}

// Outputs the one bit per pixel image data from scaleAndReduce to the console.
function render(image) {
  let offset = 0;
  for ( let y = 0; y < TARGET_HEIGHT; y++ ) {
    console.log(
      image.slice(offset, offset + TARGET_WIDTH/8)
           .map(v =>
             v.toString(2)
              .padStart(8, '0')
              .replaceAll('0', '  ')
              .replaceAll('1', '██')
           )
           .join('')
    );
    offset += TARGET_WIDTH/8;
  }
}

// Outputs the one bit per pixel image data from scaleAndReduce to the console.
function formatForOcto(image) {
  let output = "";
  let offset = 0;
  const stride = 32;
  for ( let i = 0; i < image.length; i += stride ) {
    const line = image.slice(i, i + stride)
                      .map(v => '0x' + v.toString(16).padStart(2, '0'))
                      .join(' ');
    output +=  `  ${line}\n`;
  }
  return output;
}
