#!/usr/bin/env node

function assert(condition, message) {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    process.exit(1);
  }
}

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
    frames: 1,
    outputType: 'input'
  };
}

const nibbleLookup = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
let prev = false;
for ( const f of Object.keys(movie) ) {
  const frame = movie[f];

  frame.RLE = rleEncode(frame.input);
  if ( frame.RLE.length < frame[frame.outputType].length ) frame.outputType = 'RLE';

  // frame.bbox = bboxEncode(frame.input);
  // if ( frame.bbox.length < frame[frame.outputType].length ) frame.outputType = 'bbox';

  if ( f > FRAME_START ) {
    frame.diff = frame.input.map((v, i) => v ^ movie[prev].input[i]);
    if ( frame.diff.length < frame[frame.outputType].length ) frame.outputType = 'diff';

    frame.diffRLE = rleEncode(frame.diff);
    if ( frame.diffRLE.length < frame[frame.outputType].length ) frame.outputType = 'diffRLE';

    frame.numChangedPixels = frame.diff.reduce((a,v) =>
      v == 0 ? a : a + (nibbleLookup[v >> 4] + nibbleLookup[v & 0xF]), 0
    );
    frame.duplicate = frame.numChangedPixels <= NUM_PIXELS_CONSIDERED_NO_CHANGE;

    if ( frame.duplicate ) {
      movie[prev].frames++;
      assert(movie[prev].frames < 31, "Number of frames to merge is less than 31");
    }
  }

  if (!frame.duplicate) prev = f;
  frame.output = frame[frame.outputType];
}

render(movie[Object.keys(movie).pop()].input);

const clearScreen = 1 << 7;
const decodeRLE   = 1 << 6;
const useBbox     = 1 << 5;

const encodings = {
  'input':        clearScreen,
  'bbox':         clearScreen + useBbox,
  'bboxRLE':      clearScreen + useBbox + decodeRLE,
  'RLE':          clearScreen + decodeRLE,
  'diff':         0,
  'diffRLE':      decodeRLE,
  'diffBbox':     useBbox,
  'diffBboxRLE':  useBbox + decodeRLE
};

fs.writeFileSync('player/frames.8o',
  '#data\n\n' +
  Object.values(movie)
        .filter(v => !v.duplicate)
        .map(v => {
          const settingsByte = encodings[v.outputType] + (v.frames - 1);
          return (
            `: bad_apple_${v.id} # ${v.outputType}\n` +
            `  0x${(settingsByte).toString(16).padStart(2, '0')}\n` +
            formatForOcto(v.output)
          );
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

const totalSize = Math.ceil(output/(FRAME_END-FRAME_START+1)*6562/2);
const maxSize = 62261;
console.log(`\nExtrapolated to 6562 frames at 15FPS, this would be ${totalSize} bytes ${totalSize > maxSize ? `(${totalSize - maxSize} bytes (${Math.round((totalSize - maxSize)/totalSize*1000)/10}%) too much)` : `-- We made it! 🎉`}`)

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
