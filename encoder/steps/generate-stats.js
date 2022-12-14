module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    methods: ['input'],
    input: 'input',
    encoded: 'encoded',
    additionalSize: 0,
    verbose: false
  }, options);

  // Set sizes on each frame and collect stats for each method
  const methods = {};
  let chosenSize = 0;
  let chosenPresent = 0;
  options.methods.unshift('input');
  for ( const frame of movie ) {
    frame.inputSize = frame[options.input].length;
    frame.encodedSize = frame[options.encoded]?.length || 0;
    if ( frame.method != 'skip' ) {
      chosenSize += frame.encodedSize;
      chosenPresent++;
    }

    options.methods.forEach(method => {
      methods[method] ??= {
        size: 0,
        present: 0,
        chosen: 0
      };
      methods[method].size += frame[method] ? frame[method].length : 0
      if ( frame[method] ) methods[method].present++;
      if ( method == frame.method ) methods[method].chosen++;
    });
  }

  // Calculate additional stats for each method
  const totalFrames = movie.length;
  for ( const method of Object.values(methods) ) {
    if ( method.present == 0 ) method.present = movie.length;
    method.presentFraction = method.present / totalFrames;
    method.sizeFraction = method.size / methods[options.input].size / method.presentFraction;
    method.compressionRatio = `${Math.round((1 - method.sizeFraction) * 1000)/10}%`;
    method.chosenFraction = method.chosen / method.present;
    method.chosenPercentage = `${Math.round(method.chosenFraction * 1000)/10}%`;
  }

  const presentFraction = chosenPresent / totalFrames;
  const sizeFraction = (chosenSize + options.additionalSize) / methods[options.input].size / presentFraction;
  const oldStyleSizeFraction = chosenSize / methods[options.input].size / presentFraction;
  methods['Chosen encodings'] = {
    size: chosenSize + options.additionalSize,
    present: chosenPresent,
    chosen: chosenPresent,
    presentFraction,
    sizeFraction,
    compressionRatio: `${Math.round((1 - sizeFraction) * 1000)/10}%`,
    oldStyleCompressionRatio: `${Math.round((1 - oldStyleSizeFraction) * 1000)/10}%`
  };

  if ( options.verbose ) printStats(methods);

  return methods;
};

function printStats(methods) {
  const longestMethod = Math.max(...Object.keys(methods).map(method => method.length));
  for ( const method in methods ) {
    if ( methods[method].chosenPercentage ) {
      const chosenOutput = `Method chosen: ${methods[method].chosenPercentage.padStart(5, ' ')} (${methods[method].chosen})`;
      console.log(`${method.padEnd(longestMethod, ' ')}  -  ${chosenOutput.padEnd(27, ' ')}  -  Compression ratio: ${methods[method].compressionRatio.padStart(5, ' ')}  -  Total size: ${methods[method].size.toString().padStart(6, ' ')} bytes`);
    } else {
      console.log(`${method.padEnd(longestMethod, ' ')}  -  Total size: ${methods[method].size.toString().padStart(8, ' ')} bytes   -  Compression ratio: ${methods[method].compressionRatio.padStart(5, ' ')}  (Old style: ${methods[method].oldStyleCompressionRatio})`);
    }
  }
}
