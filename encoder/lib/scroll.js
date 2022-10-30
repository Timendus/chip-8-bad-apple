const interlacing = require('../lib/interlacing.js');

module.exports = function(data, width, interlaced, oddEven, direction, pixels = 4) {
  // If we're not applying interlacing, just scroll the whole screen
  if ( !interlaced )
    return scroll(data, width, direction, pixels);

  // Otherwise, only scroll the odd or even lines
  let selection = interlacing.encode(data, width, oddEven);
  selection = scroll(selection, width, direction, Math.floor(pixels / 2));
  return interlacing.decode(selection, width, oddEven, data);
}

function scroll(data, width, direction, pixels) {
  // Make a copy
  data = data.map(v => v);
  // For up and down
  const factor = width / 8 * pixels;
  const length = data.length;
  const empty = new Array(factor).fill(0);

  switch(direction) {
    case 'up':
      data.splice(0, empty.length);
      data.push(...empty);
      break;

    case 'down':
      data.unshift(...empty);
      data.splice(length, empty.length);
      break;

    case 'left':
      for ( let i = 0; i < data.length; i++ ) {
        const shiftedOut = data[i] >> (8 - pixels);
        data[i] = (data[i] << pixels) & 0xFF;
        if ( i % (width / 8) != 0 )
          data[i-1] |= shiftedOut;
      }
      break;

    case 'right':
      let previousShiftedOut;
      for ( let i = 0; i < data.length; i++ ) {
        const shiftedOut = (data[i] << (8 - pixels)) & 0xFF;
        data[i] = data[i] >> pixels;
        if ( i % (width / 8) != 0 )
          data[i] |= previousShiftedOut;
        previousShiftedOut = shiftedOut;
      }
      break;
  }

  return data;
}
