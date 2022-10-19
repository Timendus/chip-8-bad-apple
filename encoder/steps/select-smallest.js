module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    selectFrom: ['input'],
    encoded: 'encoded'
  }, options);

  // Find the shortest dataset from the options for each frame
  for ( const frame of movie ) {
    let chosenMethod = false;
    let shortest = Infinity;
    options.selectFrom.forEach(method => {
      if ( frame[method] && frame[method].length < shortest ) {
        chosenMethod = method;
        shortest = frame[method].length;
      }
    });
    if ( !chosenMethod ) continue;
    frame[options.encoded] = frame[chosenMethod];
    frame.method = chosenMethod;
  }
};
