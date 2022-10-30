const {
  boundingBox,
  rle,
  huffmanEncoder,
  interlacing,
  singleBytes,
  scroll
} = require('../lib');

const {
  render,
  renderSideBySide,
  assert,
  assertAndWarn,
  arrayDifference
} = require('../lib/helpers.js');

const scrollDirections = {
  'scroll-left':   1 << 0,
  'scroll-right':  1 << 1,
  'scroll-up-4':   1 << 2,
  'scroll-up-2':   1 << 3,
  'scroll-down-4': 1 << 4,
  'scroll-down-2': 1 << 5
};

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
  let savedDisplay = [];
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
      const scrolling = Object.keys(scrollDirections).reduce(
        (a, m) => a | (chain.includes(m) ? scrollDirections[m] : 0),
        0
      );

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

      if ( scrolling != 0 ) encoded = [scrolling, ...encoded];
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
      case 'scroll-left':   savedDisplay.push(display); display = scroll(display, options.width, interlaced, oddRow, 'left');    return data;
      case 'scroll-right':  savedDisplay.push(display); display = scroll(display, options.width, interlaced, oddRow, 'right');   return data;
      case 'scroll-up-4':   savedDisplay.push(display); display = scroll(display, options.width, interlaced, oddRow, 'up');      return data;
      case 'scroll-up-2':   savedDisplay.push(display); display = scroll(display, options.width, interlaced, oddRow, 'up', 2);   return data;
      case 'scroll-down-4': savedDisplay.push(display); display = scroll(display, options.width, interlaced, oddRow, 'down');    return data;
      case 'scroll-down-2': savedDisplay.push(display); display = scroll(display, options.width, interlaced, oddRow, 'down', 2); return data;
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
      case 'scroll-left':   display = savedDisplay.pop(); return data;
      case 'scroll-right':  display = savedDisplay.pop(); return data;
      case 'scroll-up-4':   display = savedDisplay.pop(); return data;
      case 'scroll-up-2':   display = savedDisplay.pop(); return data;
      case 'scroll-down-4': display = savedDisplay.pop(); return data;
      case 'scroll-down-2': display = savedDisplay.pop(); return data;
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
      'scroll-left':   0,
      'scroll-right':  0,
      'scroll-up-2':   0,
      'scroll-down-2': 0,
      'scroll-up-4':   0,
      'scroll-down-4': 0,
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
