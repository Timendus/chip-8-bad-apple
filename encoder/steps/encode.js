const {
  boundingBox,
  rle,
  huffmanEncoder,
  interlacing,
  singleBytes
} = require('../lib');

const {
  render,
  renderSideBySide,
  assert,
  assertAndWarn,
  arrayDifference
} = require('../lib/helpers.js');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    methods: [],
    input: 'input',
    encoded: 'encoded',
    output: 'output',
    repeatFrames: 'repeatFrames',
    width: 48,
    height: 32,
    render: false,
    maxSize: Infinity
  }, options);

  // Apply all chains of encoders (and decoders) to all frames, sequentially
  let oddRow = 0;
  let display = new Array(options.width * options.height / 8).fill(0);
  let previousFrame = false;
  let runningTotal = 0;
  for ( const frame of movie ) {
    if ( !frame[options.input] ) continue;
    assert(frame[options.input].every(v => typeof v == 'number'), `Expecting the input image to hold only numeric values for frame ${frame.id}`);

    // If there is no change, just show the previous frame longer
    frame[options.repeatFrames] = 0;
    if ( previousFrame && arrayDifference(display, frame[options.input]) == 0 ) {
      previousFrame[options.repeatFrames]++;
      frame.method = 'skip';
      continue;
    }

    const encodings = {};
    for ( const chain of options.methods ) {
      // Do we have to keep the first two bytes of data untouched when doing
      // Huffman/RLE encoding?
      const headerSize = chain.includes('bbox') ? 2 : 0;
      const interlaced = chain.includes('interlacing');

      // Skip interlaced chains for the first frame, otherwise the message gets
      // garbled and unreadable
      if ( frame.id == '000' && interlaced ) continue;

      let encoded = frame[options.input];
      for ( const method of chain )
        encoded = encode(method, encoded, headerSize, interlaced);
      let decoded = encoded;
      for ( const method of chain.map(v => v).reverse() )
        decoded = decode(method, decoded, headerSize, interlaced);

      // Limit to the max frame size
      decoded = decoded.slice(0, options.width * options.height / 8);

      const chainString = JSON.stringify(chain);
      const pixelsDifference = arrayDifference(decoded, frame[options.input]);
      const allowedDifference = findAllowedDifference(chain);
      assert(decoded.every(v => typeof v == 'number' && v >= 0 && v <= 255), `${chainString}: Expecting the decoded image to hold only numeric values between 0 and 255 for frame ${frame.id} and chain ${chainString}: ${JSON.stringify(decoded)}`);
      assert(decoded.length == frame[options.input].length, `${chainString}: Output size (${decoded.length}) should equal input size (${frame[options.input].length} bytes) for frame ${frame.id}`);
      assert(pixelsDifference <= allowedDifference, `${chainString}: Decoded should match input for frame ${frame.id}. Found ${pixelsDifference} pixels that don't match, where ${allowedDifference} pixels are allowed.\n\nGot decoded:\n${render(decoded, options.width)}\n${JSON.stringify(decoded)}\n\nExpected input:\n${render(frame[options.input], options.width)}\n${JSON.stringify(frame[options.input])}\n`);
      // assertAndWarn(pixelsDifference == 0, `Warning: Difference of ${pixelsDifference} between input and decoded for frame ${frame.id}`);
      encodings[chainString] = { encoded, decoded };
      frame[chainString] = encoded;
    }
    selectSmallest(frame, encodings);
    frame.oddRow = !!oddRow;
    if ( options.render ) console.log(renderSideBySide(frame[options.input], frame[options.output], options.width));
    display = frame[options.output];
    previousFrame = frame;
    oddRow ^= 1;
    runningTotal += frame[options.encoded].length + 1;
    if ( runningTotal >= options.maxSize ) {
      console.log(`Made it to frame ${previousFrame.id} before running out of memory`);
      frame[options.encoded] = undefined;
      break;
    }
  }

  function encode(method, data, headerSize, interlaced) {
    switch(method) {
      case 'interlacing':   return interlacing.encode(data, options.width, oddRow);
      case 'diff':          return data.map((byte, i) => byte ^ display[i]);
      case 'bbox':          return boundingBox.encode(data, options.width, interlaced);
      case 'RLE':           return split(data, headerSize, rle.encode);
      case 'Huffman':       return split(data, headerSize, huffmanEncoder.encodeWithCodebook);
      case 'globalHuffman': return split(data, headerSize, huffmanEncoder.encodeGlobal);
      case 'singleBytes':   return split(data, headerSize, data => singleBytes.encode(data, options.width));
    }
  }

  function decode(method, data, headerSize, interlaced) {
    const dataLength = options.width * options.height / 8;
    switch(method) {
      case 'interlacing':   return interlacing.decode(data, options.width, oddRow, new Array(dataLength).fill(0));
      case 'diff':          return data.map((byte, i) => byte ^ display[i]);
      case 'bbox':          return boundingBox.decode(new Array(dataLength).fill(0), data, options.width, interlaced);
      case 'RLE':           return split(data, headerSize, rle.decode);
      case 'Huffman':       return split(data, headerSize, huffmanEncoder.decodeWithCodebook);
      case 'globalHuffman': return split(data, headerSize, huffmanEncoder.decodeGlobal);
      case 'singleBytes':   return split(data, headerSize, data => singleBytes.decode(data, options.width, new Array(dataLength).fill(0)));
    }
  }

  function split(data, headerSize, func) {
    return [...data.slice(0, headerSize), ...func(data.slice(headerSize))];
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

  function findAllowedDifference(method) {
    const lossyness = {
      'interlacing':   options.width * options.height / 2,
      'diff':          0,
      'bbox':          0,
      'RLE':           0,
      'Huffman':       30,
      'globalHuffman': 30,
      'singleBytes':   0,
    };
    return Math.max(...method.map(v => lossyness[v]));
  }
};
