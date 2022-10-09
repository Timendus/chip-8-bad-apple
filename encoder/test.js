#!/usr/bin/env node

function assert(condition, message) {
  if (!condition) throw `Assertion failed: ${message}`;
}

const huffman = require('./huffman.js');

// const data = [54,7,8,43,23,4,5,6,7,23,2,6,8,3,32,2,5,35,4,23,6,16,23,23,2,5];
const data = [0,0,0,0,15,255,0,0,0,0,31,255,0,0,0,0,31,255,0,0,0,0,31,255,0,0,0,0,31,255,0,0,0,0,63,255,0,0,0,0,63,255,4,0,0,0,127,255,0,0,0,0,7,255,0,0,0,0,7,255,0,0,0,0,7,255,16,0
,0,0,15,255,48,0,0,0,7,255,32,0,0,0,1,255,32,0,0,0,0,255,64,0,0,0,0,127,64,0,0,0,0,63,0,0,0,0,0,31,0,0,0,0,0,31,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,
0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0];

const tree = huffman.createTree(data);
const encoded = huffman.encode(data, tree);
const decoded = huffman.decode(encoded);

console.log({ data, size: data.length });
console.log({ encoded, size: encoded.length });
console.log({ decoded, size: decoded.length });

assert(decoded.slice(0, data.length).every((v,i) => v == data[i]), 'Decoded does not match data');
