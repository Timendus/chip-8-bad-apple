const bbox = require('../lib/bounding-box.js');
const rle = require('../lib/rle.js');
const huffman = require('../lib/huffman-encoder.js');
const { render, assert, arrayDifference } = require('../lib/helpers.js');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    methods: [],
    input: 'input',
    encoded: 'encoded',
    output: 'output',
    width: 48,
    height: 32,
    render: false
  }, options);

  // Apply all chains of encoders (and decoders) to all frames, sequentially
  let previousFrame = false;
  for ( const frame of movie ) {
    if ( !frame[options.input] ) continue;
    const encodings = {};
    for ( const chain of options.methods ) {
      let encoded = frame[options.input];
      for ( const method of chain )
        encoded = encode(method, encoded, previousFrame);
      let decoded = encoded;
      for ( const method of chain.map(v => v).reverse() )
        decoded = decode(method, decoded, previousFrame);

      const chainString = JSON.stringify(chain);
      assert(decoded.length == frame[options.input].length, `${chainString}: Output size (${decoded.length}) should equal input size (${frame[options.input].length} bytes) for frame ${frame.id}`);
      assert(arrayDifference(decoded, frame[options.input]) == 0, `${chainString}: Decoded should match input for frame ${frame.id}.\n\nGot decoded ${JSON.stringify(decoded)}\n\nExpected input ${JSON.stringify(frame[options.input])}\n`);
      encodings[chainString] = { encoded, decoded };
      frame[chainString] = encoded;
    }
    selectSmallest(frame, encodings);
    if ( options.render ) render(frame[options.output], options.width);
    previousFrame = frame[options.input];
  }

  function encode(method, data, previousFrame) {
    switch(method) {
      case 'diff':          return data.map((byte, i) => byte ^ (previousFrame[i] || 0));
      case 'bbox':          return bbox.encode(data, options.width);
      case 'RLE':           return rle.encode(data);
      case 'Huffman':       return huffman.encodeWithCodebook(data);
      case 'globalHuffman': return huffman.encodeGlobal(data);
    }
  }

  function decode(method, data, previousFrame) {
    const dataLength = options.width * options.height / 8;
    switch(method) {
      case 'diff':          return data.map((byte, i) => byte ^ (previousFrame[i] || 0));
      case 'bbox':          return bbox.decode(/*previousFrame || */new Array(dataLength), data, options.width);
      case 'RLE':           return rle.decode(data);
      case 'Huffman':       return huffman.decodeWithCodebook(data, dataLength);
      case 'globalHuffman': return huffman.decodeGlobal(data, dataLength);
    }
  }

  function selectSmallest(frame, encodings) {
    let chosenMethod = false;
    let shortest = Infinity;
    Object.keys(encodings).forEach(method => {
      if ( encodings[method].encoded.length < shortest ) {
        chosenMethod = method;
        shortest = encodings[method].encoded.length;
      }
    });
    assert(chosenMethod, `A method of encoding should have been selected`);
    frame[options.encoded] = encodings[chosenMethod].encoded;
    frame[options.output] = encodings[chosenMethod].decoded;
    frame.method = chosenMethod;
  }
};
