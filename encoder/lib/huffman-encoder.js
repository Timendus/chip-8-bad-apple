const huffman = require('./huffman.js');
const {assert, arrayDifference} = require('./helpers.js');

let globalMappings, globalCodebook;

function encodeWithCodebook(data) {
  return huffman.encodeWithCodebook(data);
}

function decodeWithCodebook(data, length) {
  return huffman.decodeWithCodebook(data).slice(0, length);
}

function encodeGlobal(data) {
  return huffman.encode(data, globalCodebook, globalMappings);
}

function decodeGlobal(data, length) {
  return huffman.decode(data, globalCodebook).slice(0, length);
}

function encodedCodebook() {
  return huffman.encodeCodebook(globalCodebook);
}

function generateCodebook(possibleValues, maxBits, complete) {
  // Add values that we're missing in the set of possible values, if requested
  if ( complete ) {
    const uniquePosValues = [...new Set(possibleValues)].sort((a,b) => a - b);
    for ( let i = 0; i < 256; i++ )
      if ( !uniquePosValues.includes(i) )
        possibleValues.push(i);
  }

  // Generate a Huffman codebook from the data.
  [globalMappings, globalCodebook] = huffman.createLimitedCodebook(possibleValues, maxBits);

  // Warn the user of any losses in quality or encoding issues
  console.warn(`There are ${Object.keys(globalMappings).length} bytes that we can't store perfectly`);
  const foundMaxBits = Math.max(...globalCodebook.map(v => v[1].length));
  const numTooLarge = globalCodebook.filter(v => v[1].length > maxBits).length;
  assert(foundMaxBits <= maxBits, `Huffman: Found ${numTooLarge} entries in the Huffman codebook that encode to too many bits. Longest value is ${foundMaxBits} bits. Can't handle more than ${maxBits}.`);
}

module.exports = {
  encodeWithCodebook,
  decodeWithCodebook,
  encodeGlobal,
  decodeGlobal,
  generateCodebook,
  encodedCodebook
};
