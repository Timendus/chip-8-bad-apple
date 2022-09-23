function createTree(data) {
  const frequencies = {};
  data.forEach(b => frequencies[b] = (frequencies[b] || 0) + 1);
  const sorted = Object.keys(frequencies)
                       .map(v => ({ value: v, freq: frequencies[v] }))
                       .sort((a, b) => a.freq - b.freq);
  while ( sorted.length > 1 ) {
    const left = sorted.shift();
    const right = sorted.shift();
    const node = {
      left, right,
      freq: left.freq + right.freq
    };
    sorted.push(node);
    sorted.sort((a, b) => a.freq - b.freq);
  }
  return sorted[0];
}

function createCodebook(node, bits='') {
  if ( 'value' in node )
    return [[node.value, bits]];
  return [
    ...createCodebook(node.left, bits + '0'),
    ...createCodebook(node.right, bits + '1')
  ];
}

// See: https://en.wikipedia.org/wiki/Canonical_Huffman_code
function toCanonicalCodebook(codebook) {
  // Sort by codeword length, then value of character
  codebook = codebook.sort((a,b) => a[1].length - b[1].length || a[0] - b[0]);
  // Set each codeword to an increasing number, but respecting the codeword length
  let code = 0;
  let length = 0;
  for ( let i = 0; i < codebook.length; i++ ) {
    if ( length < codebook[i][1].length ) {
      code <<= codebook[i][1].length - length;
      length = codebook[i][1].length;
    }
    codebook[i][1] = (code++).toString(2)
                             .padStart(codebook[i][1].length, '0');
  }
  return codebook;
}

function encodeCodebook(codebook) {
  const encodedCodeBook = [];
  for ( let i = 1; i <= codebook[codebook.length - 1][1].length; i++ ) {
    encodedCodeBook.push(codebook.filter(v => v[1].length == i).length);
  }
  return [encodedCodeBook.length, ...encodedCodeBook, ...codebook.map(([c]) => +c)];
}

function decodeCodebook(data) {
  const bitsLength = data[0];
  const codebook = [];
  let code = 0;
  let i = 1;
  for ( let bits = 1; bits <= bitsLength; bits++ ) {
    let numToGo = data[bits];
    while ( numToGo > 0 ) {
      codebook.push([data[bitsLength + i], code.toString(2).padStart(bits, '0')]);
      i += 1;
      numToGo -= 1;
      code += 1;
      if ( numToGo == 0 ) code <<= 1;
    }
  }
  return codebook;
}

function encode(data, tree) {
  // Create codebook from Huffman tree
  const codebook = toCanonicalCodebook(createCodebook(tree));

  // Encode data using the codebook
  let bits = data.map(v => codebook.find(c => c[0] == v)[1]).join('');

  // Convert string of bits to array of bytes
  const encodedData = [];
  const missing = 8 - bits.length % 8;
  bits += '0'.repeat(missing);
  for ( let i = 0; i < bits.length; i += 8 ) {
    encodedData.push(parseInt(bits.substr(i, 8), 2));
  }

  // Encode and prepend the codebook
  const encodedCodeBook = encodeCodebook(codebook);

  // Done!
  return [...encodedCodeBook, ...encodedData];
}

function decode(data) {
  // Get the codebook from the first part of the data
  const codebook = decodeCodebook(data);

  // Decode the data using the codebook
  data = data.slice(1 + data[0] + codebook.length);
  const decoded = [];
  let i = 0;
  let m = 128;
  let bits = '';
  while ( i < data.length ) {
    while ( i < data.length && !codebook.map(v => v[1]).includes(bits) ) {
      if ( (data[i] & m) != 0 )
        bits += '1';
      else
        bits += '0';
      m >>= 1;
      if ( m == 0 ) {
        i += 1;
        m = 128;
      }
    }
    if ( i < data.length )
      decoded.push(codebook.find(v => v[1] == bits)[0]);
    bits = '';
  }
  return decoded;
}

module.exports = {
  createTree,
  encode,
  decode
};
