const huffman = require('../lib/huffman.js');
const {assert, arrayDifference} = require('../lib/helpers.js');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    maxBits: 16,
    useGlobalCodebook: true,
    inputForCodebook: 'encoded',
    input: 'input',
    output: 'output',
    result: 'result',
    codebook: false,
    mappings: false
  }, options);

  // Create the codebook and mapping in case we use a globel codebook
  let globalMappings, globalCodebook;
  if ( options.useGlobalCodebook && !options.codebook ) {
    // Collect all the values used in the diffs, add values that we're then
    // missing in that set
    const possibleValues = movie.map(frame => frame[options.inputForCodebook]).flat();
    const uniquePosValues = [...new Set(possibleValues)].sort((a,b) => a - b);
    for ( let i = 0; i < 256; i++ )
      if ( !uniquePosValues.includes(i) )
        possibleValues.push(i);

    // Generate a Huffman codebook from that data.
    [globalMappings, globalCodebook] = huffman.createLimitedCodebook(possibleValues, options.maxBits);

    // Warn the user of any losses in quality or encoding issues
    console.warn(`There are ${Object.keys(globalMappings).length} bytes that we can't store perfectly`);
    const foundMaxBits = Math.max(...globalCodebook.map(v => v[1].length));
    const numTooLarge = globalCodebook.filter(v => v[1].length > options.maxBits).length;
    assert(foundMaxBits <= options.maxBits, `Huffman: Found ${numTooLarge} entries in the Huffman codebook that encode to too many bits. Longest value is ${foundMaxBits} bits. Can't handle more than ${options.maxBits}.`);
  }

  // Do the requested encoding (and decoding) of all frames
  for ( const frame of movie ) {
    if ( !frame[options.input] ) continue;

    if ( options.useGlobalCodebook ) {
      frame[options.output] = huffman.encode(frame[options.input], options.codebook || globalCodebook, options.mappings || globalMappings);
      frame[options.result] = huffman.decode(frame[options.output], options.codebook || globalCodebook).slice(0, frame[options.input].length);

      // Alert the user of frames that decode badly, given the limit on maxBits
      const numChanged = arrayDifference(frame[options.input], frame[options.result]);
      if ( numChanged > 0 )
        console.warn(`Warning: Frame ${frame.id} has ${numChanged} pixels difference after decoding`);
    } else {
      frame[options.output] = huffman.encodeWithCodebook(frame[options.input]);
      frame[options.result] = huffman.decodeWithCodebook(frame[options.output]).slice(0, frame[options.input].length);
      assert(arrayDifference(frame[options.result], frame[options.input]) == 0, `Huffman: Decoded should match input for frame ${frame.id}.\n\nGot decoded ${JSON.stringify(frame[options.result])}\n\nExpected input ${JSON.stringify(frame[options.input])}\n`);
    }
    assert(frame[options.result].length == frame[options.input].length, `Huffman: Output size (${frame[options.result].length}) should equal input size (${frame[options.input].length} bytes) for frame ${frame.id}`);
  }

  return [globalCodebook, globalMappings];
};
