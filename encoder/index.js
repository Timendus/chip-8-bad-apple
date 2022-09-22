#!/usr/bin/env node

function assert(condition, message) {
  if (!condition) throw `Assertion failed: ${message}`;
}

const fs = require('fs');
const PNG = require('pngjs').PNG;
const rleEncode = require('./rle.js');
const spriting = require('./spriting.js');

const FRAME_START   = 1;
const FRAME_END     = 2800;
const FRAME_STEP    = 2;
const TARGET_WIDTH  = 48;   // Should be divisible by 8
const TARGET_HEIGHT = 32;

const NUM_PIXELS_CONSIDERED_NO_CHANGE = 0;  // Didn't like this effect, so disabled
const SPRITING_DIFFERENCE_ALLOWED = 0.2030;
// 0.1954 happens to lead to 256 unique sprites when applied to all frames
// 0.2030 happens to lead to 255 unique sprites when applied to all diffs

const movie = {}

/* Load in all the frame images */

let lastImage = false;
for ( let i = FRAME_START; i <= FRAME_END; i+=FRAME_STEP ) {
  const id = i < 1000 ? String(i).padStart(3, '0') : i;
  const file = `frames/scaled/bad_apple_${id}.png`;
  const fileData = fs.readFileSync(file);
  const png = PNG.sync.read(fileData);
  const image = reduceTo1Bit(png.data);
  const diff = lastImage ? image.map((v, i) => v ^ lastImage[i]) : undefined;
  movie[i] = {
    id,
    input: image,
    sprites: lastImage ? spriting.chopUp(diff, TARGET_WIDTH, TARGET_HEIGHT) : undefined,
    frames: 1,
    outputType: 'input'
  };
  lastImage = image;
}

/* Determine the dictionary of unique sprites to use */

const uniqueSprites = spriting.nonEmpty(
  spriting.uniqueSprites(
    Object.values(movie)
          .map(f => f.sprites)
          .filter(f => f)
          .flat()
  )
);
const dictionary = spriting.differingSprites(uniqueSprites, SPRITING_DIFFERENCE_ALLOWED);
console.log(spriting.renderSprites(dictionary));

console.log(`Video has ${uniqueSprites.length} unique sprites`);
console.log(`Video has ${dictionary.length} sprites that differ more than ${SPRITING_DIFFERENCE_ALLOWED}`);

if ( dictionary.length > 256 ) throw 'dictionary size too large to fit in 8 bits';

/* Do the second run over all the frames, encoding each in every format */

const nibbleLookup = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
let prev = false;
let numSprited = 0;
for ( const f of Object.keys(movie) ) {
  const frame = movie[f];

  frame.RLE = rleEncode(frame.input);
  frame.boundingBox = getBoundingBox(frame.input);
  if ( frame.boundingBox.slice.length > 0 ) {
    frame.bbox = [...frame.boundingBox.encoded, ...frame.boundingBox.slice];
    frame.bboxRLE = [...frame.boundingBox.encoded, ...rleEncode(frame.boundingBox.slice)];
  }

  if ( f > FRAME_START ) {
    frame.diff = frame.input.map((v, i) => v ^ movie[prev].output[i]);
    frame.diffRLE = rleEncode(frame.diff);
    frame.sprited = spriting.encode(movie[prev].output, frame.input, frame.diff, TARGET_WIDTH, TARGET_HEIGHT, dictionary);
    frame.boundingBox = getBoundingBox(frame.diff);
    if ( frame.boundingBox.slice.length > 0 ) {
      frame.diffBbox = [...frame.boundingBox.encoded, ...frame.boundingBox.slice];
      frame.diffBboxRLE = [...frame.boundingBox.encoded, ...rleEncode(frame.boundingBox.slice)];
    }

    frame.numChangedPixels = frame.diff.reduce((a,v) =>
      a + (nibbleLookup[v >> 4] + nibbleLookup[v & 0xF]),
      0
    );
    frame.duplicate = frame.numChangedPixels <= NUM_PIXELS_CONSIDERED_NO_CHANGE;

    if ( frame.duplicate ) {
      movie[prev].frames++;
      assert(movie[prev].frames < 31, "Number of frames to merge is less than 31");
    }
  }

  // Find encoding method with the shortest output
  const methods = [
    'input',
    'RLE',
    'bbox',
    'bboxRLE',
    'diffRLE',
    'diffBbox',
    'diffBboxRLE'
  ];
  if ( numSprited < 3 ) methods.push('sprited');
  methods.forEach(method => {
    if ( frame[method] && frame[method].length < frame[frame.outputType].length )
      frame.outputType = method;
  });
  frame.encoded = frame[frame.outputType];

  // If encoding method is lossy, take the messed-up output for the next frame
  if ( frame.outputType == 'sprited' ) {
    numSprited += 1;
    frame.output = spriting.decode(movie[prev].output, TARGET_WIDTH, frame.sprited, dictionary);
  } else {
    numSprited = 0;
    frame.output = frame.input; // Lossless
  }
  // render(frame.output);

  if (!frame.duplicate) prev = f;
}

/* Output the resulting frame data to file */

const clearScreen = 1 << 7;
const decodeRLE   = 1 << 6;
const useBbox     = 1 << 5;

const encodings = {
  'input':        clearScreen,
  'bbox':         clearScreen + useBbox,
  'bboxRLE':      clearScreen + useBbox + decodeRLE,
  'RLE':          clearScreen + decodeRLE,
  'diffRLE':      decodeRLE,
  'diffBbox':     useBbox,
  'diffBboxRLE':  useBbox + decodeRLE,
  'sprited':      0
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
            formatForOcto(v.encoded)
          );
        })
        .join('\n')
);

fs.writeFileSync('player/dictionary.8o',
  '#data\n\n: dictionary\n' +
  dictionary.map(s => formatForOcto(s)).join('')
);

/* Show output and statistics */

const frames = Object.values(movie).filter(v => !v.duplicate);

render(frames[frames.length - 1].input);

console.log(`\nRENDERED ${Object.keys(movie).length} FRAMES\n`)

console.log('Encoding methods used:', {
  'input':        frames.filter(v => v.outputType == 'input').length,
  'bbox':         frames.filter(v => v.outputType == 'bbox').length,
  'bboxRLE':      frames.filter(v => v.outputType == 'bboxRLE').length,
  'RLE':          frames.filter(v => v.outputType == 'RLE').length,
  'diff':         frames.filter(v => v.outputType == 'diff').length,
  'diffRLE':      frames.filter(v => v.outputType == 'diffRLE').length,
  'diffBbox':     frames.filter(v => v.outputType == 'diffBbox').length,
  'diffBboxRLE':  frames.filter(v => v.outputType == 'diffBboxRLE').length,
  'sprited':      frames.filter(v => v.outputType == 'sprited').length,
});

const input = Object.values(movie).reduce((a, v) => a + v.input.length, 0);
const rle = frames.reduce((a, v) => a + v.RLE.length, 0);
const diffrle = frames.reduce((a, v) => a + (v.diffRLE ? v.diffRLE.length : v.RLE.length), 0);
const output = frames.reduce((a, v) => a + v[v.outputType].length, 0);
console.log(`\n${input} bytes uncompressed`);
console.log(`${rle} bytes RLE encoded (${Math.round((input-rle)/input*1000)/10}% compression rate)`);
console.log(`${diffrle} bytes RLE encoded over the diff (${Math.round((input-diffrle)/input*1000)/10}% compression rate)`);
console.log(`${output} bytes for the chosen output (${Math.round((input-output)/input*1000)/10}% compression rate)`);

console.log(`\n${dictionary.length} sprites in the dictionary, totalling ${dictionary.length * 8} bytes`);

const totalSize = Math.ceil(output/(FRAME_END-FRAME_START+1)*6562) + dictionary.length * 8;
const maxSize = 62261;
console.log(`\nTotal size: ${output + dictionary.length * 8} bytes`);
console.log(`Extrapolated to 6562 frames at 15FPS, this would be ${totalSize} bytes ${totalSize > maxSize ? `(${totalSize - maxSize} bytes (${Math.round((totalSize - maxSize)/totalSize*1000)/10}%) too much)` : `-- We made it! 🎉`}`)

/* Done! Some helper functions from here on down */

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

// Get the bounding box of actual data for this image, horizontally aligned to 8
// pixels
function getBoundingBox(image) {
  let minX = minY = 0;
  let maxX = TARGET_WIDTH / 8;
  let maxY = TARGET_HEIGHT - 1;

  while ( minY < maxY && image.slice(minY * TARGET_WIDTH / 8, minY * TARGET_WIDTH / 8 + TARGET_WIDTH / 8)
                              .every(v => v == 0) ) minY += 1;
  while ( maxY > minY && image.slice(maxY * TARGET_WIDTH / 8, maxY * TARGET_WIDTH / 8 + TARGET_WIDTH / 8)
                              .every(v => v == 0) ) maxY -= 1;

  while ( minX < maxX && image.filter((v, i) => i % (TARGET_WIDTH / 8) == minX)
                              .every(v => v == 0) ) minX += 1;
  while ( maxX > minX && image.filter((v, i) => i % (TARGET_WIDTH / 8) == maxX)
                              .every(v => v == 0) ) maxX -= 1;

  const slice = [];
  if ( minX != maxX || minY != maxY ) {
    for ( let y = minY; y <= maxY; y++ ) {
      for ( let x = minX; x <= maxX; x++ ) {
        slice.push(image[y * TARGET_WIDTH / 8 + x]);
      }
    }

    assert((maxX - minX + 1) * (maxY - minY + 1) == slice.length, `slice contains the right number of bytes`);
  }

  assert((minX & 7) == minX, `minX can be encoded in 3 bits (got: ${minX})`);
  assert((maxX & 7) == maxX, `maxX can be encoded in 3 bits (got: ${maxX})`);
  assert((minY & 31) == minY, `minY can be encoded in 5 bits (got: ${minY})`);
  assert((maxY & 31) == maxY, `maxY can be encoded in 5 bits (got: ${maxY})`);

  return {
    minX: minX * 8,
    maxX: maxX * 8,
    minY,
    maxY,
    encoded: [(minX << 5) + minY, (maxX << 5) + maxY],
    slice
  };
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
