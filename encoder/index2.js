#!/usr/bin/env node

const {
  loadImages,
  huffmanEncode,
  rleEncode,
  bboxEncode,
  diff,
  selectSmallest,
  generateStats
} = require('./steps');

const huffman = require('./lib/huffman.js');
const { render } = require('./lib/helpers.js');

const MAX_SIZE = 59931;
const movie = [];

// Load and diff all the images
loadImages(movie, { start: 1, end: 6562 });
diff(movie, {input: 'input', diffWith: 'input', encoded: 'diff'});

// Encode the images and the diffs in many possible ways
const [codebook, mappings] = huffmanEncode(movie, {input: 'diff', inputForCodebook: 'diff', encoded: 'diffGlobalHuffman'});
huffmanEncode(movie, {input: 'input', encoded: 'globalHuffman', codebook, mappings});
rleEncode(movie, {input: 'input', encoded: 'RLE'});
rleEncode(movie, {input: 'diff', encoded: 'diffRLE'});
bboxEncode(movie, {input: 'input', encoded: 'bbox'});
bboxEncode(movie, {input: 'diff', encoded: 'diffBbox'});

// Select the smallest encoding of the bunch
const encodingMethods = ['globalHuffman', 'diffGlobalHuffman', 'RLE', 'diffRLE', 'bbox', 'diffBbox'];
selectSmallest(movie, {selectFrom: encodingMethods, encoded: 'encoded'});

// Show a random frame
console.log();
render(movie[Math.floor(Math.random() * movie.length)].input, 48);
console.log();

// Generate some fancy stats about the results
const allMethods = ['input', 'diff', 'globalHuffman', 'diffGlobalHuffman', 'RLE', 'diffRLE', 'bbox', 'diffBbox'];
const encodedCodebook = huffman.encodeCodebook(codebook);
const stats = generateStats(movie, { methods: allMethods, additionalSize: encodedCodebook.length, verbose: true });

console.log();
if ( stats['Chosen encodings'].size < MAX_SIZE ) console.log(`This fits in the available memory! 🎉`)
console.log("Done!");
