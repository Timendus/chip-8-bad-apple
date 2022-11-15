const fs = require('fs');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    framesPath: "player/video/lores/frames.8o",
    codebookPath: "player/video/lores/codebook.8o",
    codebook: false,
    encoded: 'encoded'
  }, options);

  // Write data to the Octo files

  fs.writeFileSync(options.framesPath,
    ':segment data\n\n' +
    movie.filter(frame => frame[options.encoded])
         .map(frame => {
           return (
             `: bad_apple_${frame.id} # ${frame.method}\n` +
             formatForOcto(frame[options.encoded])
           );
         })
         .join('\n')
  );

  fs.writeFileSync(options.codebookPath,
    ':segment data\n\n: huffman-codebook\n' +
    formatForOcto(options.codebook)
  );

}

// Outputs the one bit per pixel image data from scaleAndReduce to the console.
function formatForOcto(image) {
  let output = "";
  let offset = 0;
  const stride = 16;
  for ( let i = 0; i < image.length; i += stride ) {
    const line = image.slice(i, i + stride)
                      .map(v => '0x' + v.toString(16).padStart(2, '0'))
                      .join(' ');
    output +=  `  ${line}\n`;
  }
  return output;
}
