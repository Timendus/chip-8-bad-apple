function assert(condition, message) {
  if (!condition) throw `Assertion failed: ${message}`;
}

function assertAndWarn(condition, message) {
  if (!condition) console.warn(`Assertion failed: ${message}`);
}

// Returns how many bits (pixels) are different between two bytes
const nibbleLookup = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
function byteDifference(a, b) {
  const diff = a ^ b;
  return nibbleLookup[diff >> 4] + nibbleLookup[diff & 0xF];
}

// The same as the above, but for arrays of bytes
function arrayDifference(a, b) {
  return a.reduce((acc, v, i) =>
    acc + byteDifference(v, b[i]),
    0
  );
}

// Returns the one bit per pixel image data as a visualized string
function render(image, width) {
  assert(typeof width == 'number', `Expecting a valid image width`);
  assert(image.length % width == 0, 'Expecting image data to be a multiple of `width`');
  assert(image.length > 0, 'Expecting the image to have some data');
  assert(image.every(v => typeof v == 'number'), 'Expecting the image to hold only values');
  let offset = 0;
  let output = '';
  const height = image.length / (width / 8);
  for ( let y = 0; y < height; y++ ) {
    output += image.slice(offset, offset + width/8)
                   .map(v =>
                     v.toString(2)
                      .padStart(8, '0')
                      .replaceAll('0', '  ')
                      .replaceAll('1', '██')
                   )
                   .join('');
    output += '\n';
    offset += width/8;
  }
  return output;
}

function renderSideBySide(imageA, imageB, width) {
  imageA = render(imageA, width).split('\n');
  imageB = render(imageB, width).split('\n');
  return imageA.map((v, i) => v + '   ' + imageB[i]).join('\n');
}

// Auto-load all files in this directory so we can have cleaner imports
function autoLoad(directory, filename) {
  const fs = require('fs');
  const path = require('path');

  const files = fs.readdirSync(directory)
                  .filter(file => (file.indexOf('.') !== 0) && (file !== path.basename(filename)));

  const allFiles = {};
  files.forEach(file => {
    const contents = require(path.join(directory, file));
    let name = camelcase(file.replace('.js', '').replace(/\-/g, ' '));
    allFiles[name] = contents;
  });

  return allFiles;
}

function camelcase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index == 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

module.exports = {
  assert,
  assertAndWarn,
  byteDifference,
  arrayDifference,
  render,
  renderSideBySide,
  autoLoad
};
