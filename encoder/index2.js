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
diff(movie, {input: 'input', diffWith: 'input', output: 'diff'});

// Encode the images and the diffs in many possible ways
const [codebook, mappings] = huffmanEncode(movie, {input: 'diff', inputForCodebook: 'diff', output: 'diffGlobalHuffman'});
huffmanEncode(movie, {input: 'input', output: 'globalHuffman', codebook, mappings});
rleEncode(movie, {input: 'input', output: 'RLE'});
rleEncode(movie, {input: 'diff', output: 'diffRLE'});
bboxEncode(movie, {input: 'input', output: 'bbox'});
bboxEncode(movie, {input: 'diff', output: 'diffBbox'});

// Select the smallest encoding of the bunch
const encodingMethods = ['globalHuffman', 'diffGlobalHuffman', 'RLE', 'diffRLE', 'bbox', 'diffBbox'];
selectSmallest(movie, {selectFrom: encodingMethods, output: 'output'});

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
