#!/usr/bin/env node

const huffman = require('./lib/huffman.js');

test([1,2,2,3], 'four values');

test([5,1,2,2,3], 'five values');

test([5,1,2,2,3,3,7,8], 'eight values');

test([5,1,2,2,3,6,7,8,9], 'nine values');

test([54,7,8,43,23,4,5,6,7,23,2,6,8,3,32,2,5,35,4,23,6,16,23,23,2,5], 'lots of values');

test(
  [
    0,0,0,0,15,255,0,0,0,0,31,255,0,0,0,0,31,255,0,0,0,0,31,255,0,0,0,0,31,255,0,0,0,0,63,255,0,0,0,0,63,255,4,0,0,0,127,255,0,0,0,0,7,255,0,0,0,0,7,255,0,0,0,0,7,255,16,0,
    0,0,15,255,48,0,0,0,7,255,32,0,0,0,1,255,32,0,0,0,0,255,64,0,0,0,0,127,64,0,0,0,0,63,0,0,0,0,0,31,0,0,0,0,0,31,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,
    0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,15,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0
  ],
  'a full frame'
);

test(
  [
    77,95,13,195,169,16,157,184,247,229,240,93,246,6,129,167,221,172,192,226,19,48,11,30,211,70,147,193,62,135,47,107,93,233,254,79,47,32,6,128,218,150,45,18,4,224,165,8,199,175,165,214,128,197,65,176,126,7,252,88,159,232,168,225,81,201,32,234,193,136,158,44,211,93,177,23,44,132,117,99,98,96,192,64,211,29,138,163,143,197,149,238,23,108,109,144,141,23,210,6,66,78,125,178,140,202,97,53,188,218,199,227,57,118,245,236,100,79,213,101,166,138,107,6,16,167,159,71,100,196,126,182,18,228,50,241,87,110,33,201,115,119,198,192,64,48,171,103,252,63,63,227,252,193,236,59,139,167,25,32,166,35,61,227,66,202,164,171,19,213,74,36,110,234,206,162,100,75,137,90,231,78,142,244,159,24,244,6,194,199,123,201,25,231,172,225,73,175,230,130,227,144,184,172,36,58,101,32,255,129,56,249,172,76,111,145,28,70,111,215,226,49,108,60,161,80,239,17,72,72,229,205,227,161,121,118,190,96,180,160,5,21,82,119,169,34,254,100,183,105,206,48,240,207,252,237,22,253,193,203,71,102,162,102,119,215,129,7,186,128,37,184,139,240,69,104,191,161,152,213,230,53,205,158,84,246,220,197,222,139,28,107,163,21,77,64,154,85,220,112,115,31,202,201,37,120,184,105,63,45,214,106,130,63,174,232,129,240,62,248,146,214,174,242,82,176,209,131,151,46,58,27,195,20,122,50,188,75,57,255,10,236,96,136,29,145,160,92,173,155,251,167,51,183,42,3,247,51,123,29,126,39,9,97,159,128,242,16,99,90,20,170,149,142,111,94,131,195,213,116,137,142,93,3,79,85,171,60,10,199,11,73,144,44,96,70,131,246,108,205,71,170,121,4,37,34,54,15,146,98,85,221,210,179,252,159,18,0,210,25,148,44,184,71,224,45,196,168,100,78,33,85,49,40,16,239,0,204,72,248,162,40,202,176,43,27,102,4,148,138,98,55,140,63,227,57,64,118,172,104,116,119,148,180,25,73,88,99,112,132,200,215,38,156,17,60,195,172,53,211,16,1,230,69,230,17,19,211,7,81,33,23,191,118,241,36,79,163,187,225,86,81,221,57,135,105,140,207,150,139,86,233,165,143,43,105,43,39,120,226,233,16,251,207,228,84,111,145,254,245,72,85,202,93,51,212,212,237,70,234,97,57,152,223,116,177,49,43,7,92,45,213,76,74,182,216,188,209,202,117,83,104,30,182,83,134,188,38,217,220,81,123,185,146,95,8,93,9,123,176,127,154,205,123,203,162,61,120,158,96,195,166,148,132,60,23,153,103,234,93,49,104,54,172,221,138,218,62,135,167,164,119,105,123,108,76,160,88,24,183,46,116,18,235,76,16,52,20,33,79,81,232,87,53,20,46,200,141,38,28,220,184,229,89,174,126,83,27,240,212,194,37,183,135,134,240,166,121,166,53,13,231,49,88,202,58,155,157,247,90,96,164,57,203,69,201,199,40,216,133,74,113,132,158,41,146,125,227,224,133,252,88,209,190,24,184,33,113,46,239,203,77,246,3,39,218,120,137,103,217,150,77,118,202,134,51,56,251,48,105,100,33,171,20,88,118,12,49,78,152,31,97,197,84,45,190,219,120,132,6,162,186,157,225,117,230,80,37,121,62,156,213,153,227,25,116,232,186,145,198,214,74,134,211,230,159,239,106,122,77,227,156,56,187,213,162,223,71,68,104,231,49,23,132,251,201,89,238,27,58,223,113,246,121,165,31,107,80,164,177,58,158,224,223,46,20,172,94,72,126,191,33,159,73,72,74,49,149,54,246,70,100,63,115,252,235,172,39,83,58,91,89,200,146,62,33,9,155,252,214,114,158,234,235,30,175,123,231,144,43,159,171,209,247,251,158,54,21,207,97,112,148,237,178,196,100,11,8,199,226,146,236,214,186,33,96,33,59,20,49,46,239,184,136,145,250,119,248,60,128,255,198,165,2,87,134,7,232,145,131,231,63,14,7,245,203,230,40,203,216,253,14,155,48,192,43,75,33,73,247,85,177,160,107,157,50,117,7,109,4,41,22,174,202,242,8,235,76,14,62,248,15,116,73,152,110,63,11,161,48,23,186,226,179,216,156,165,96,234,156,84,96,219,141,66,105,175,80,239,181,201,199,50,159,35,192,200,129,100,66,224,173,86,13,83,243,149,168,87,173,138,244,254,150,128,162,236,66,90,44
  ],
  '1000 bytes of random noise'
);

console.log('All good!');

function assert(condition, message) {
  if (!condition) throw `Assertion failed: ${message}`;
}

function test(data, name) {
  const codebook = huffman.createCodebook(data);
  const encodedCodebook = huffman.encodeCodebook(codebook);
  const encoded = huffman.encode(data, codebook);

  const decodedCodebook = huffman.decodeCodebook(encodedCodebook);
  const decoded = huffman.decode(encoded, decodedCodebook);
  const decoded2 = huffman.decodeOnTheFly(encodedCodebook, encoded);

  assert(decoded.slice(0, data.length).every((v,i) => v == data[i]), `Decoded does not match data for ${name}.\nExpected:\n${JSON.stringify(data)}\nReceived:\n${JSON.stringify(decoded)}\nWith codebook:\n${JSON.stringify(codebook)}`);
  assert(decoded2.slice(0, data.length).every((v,i) => v == data[i]), `Decoded on the fly does not match data for ${name}.\nExpected:\n${JSON.stringify(data)}\nReceived:\n${JSON.stringify(decoded2)}\nWith codebook:\n${JSON.stringify(codebook)}`);
}