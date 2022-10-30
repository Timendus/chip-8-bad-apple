module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    input: 'encoded',
    output: 'encoded'
  }, options);

  // How do we encode the chosen compression chain in the settings byte?
  const oddRow        = 1 << 2;
  const repeatFrame   = 1 << 1;
  const encodings = {
    'diff':          1 << 7,
    'RLE':           1 << 6,
    // 'Huffman':       1 << 5,
    'globalHuffman': 1 << 5,
    'bbox':          1 << 4,
    'interlacing':   1 << 3,
    'singleBytes':   (1 << 5) + (1 << 6),

    'scroll-left':   1 << 0,
    'scroll-right':  1 << 0,
    'scroll-up-2':   1 << 0,
    'scroll-up-4':   1 << 0,
    'scroll-down-2': 1 << 0,
    'scroll-down-4': 1 << 0,
  };

  // Give each frame a one or two byte header with the right settings
  for ( const frame of movie ) {
    if ( !frame[options.input] ) continue;

    let settings = JSON.parse(frame.method).reduce((acc, method) => acc + encodings[method], 0);
    settings += frame.oddRow ? oddRow : 0;
    if ( frame.repeatFrames > 0 )
      frame[options.output] = [settings + repeatFrame, frame.repeatFrames, ...frame[options.input]];
    else
      frame[options.output] = [settings, ...frame[options.input]];
  }
}
