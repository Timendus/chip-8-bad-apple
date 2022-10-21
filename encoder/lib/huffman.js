// Implementation of the Huffman algorithm to compress data

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

function buildCodebook(node, bits='') {
  if ( 'value' in node )
    return [[node.value, bits]];
  return [
    ...buildCodebook(node.left, bits + '0'),
    ...buildCodebook(node.right, bits + '1')
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

// Returns the optimal canonical Huffman codebook for the given data
function createCodebook(data) {
  return toCanonicalCodebook(buildCodebook(createTree(data)));
}

// Returns the optimal canonical Huffman codebook for the given data, but limits
// the codebook to using max `maxBits` bits. Values that are encoded in more
// than `maxBits` bits will be replaced by values that are as similar as
// possible (in a visual sense). So this gives us a "lossy" codebook.
function createLimitedCodebook(data, maxBits) {
  let codebook = toCanonicalCodebook(buildCodebook(createTree(data)));
  const mappings = {};
  const validValues = codebook.filter(v => v[1].length < maxBits).map(v => v[0]);
  codebook = codebook.filter(([val, bits]) => {
    if ( bits.length < maxBits )
      return true;
    const nearest = validValues.sort((a, b) => difference(val, a) - difference(val, b))[0];
    mappings[val] = nearest;
    return false;
  });
  return [mappings, codebook];
}

// Returns how many bits (pixels) are different between two bytes
const nibbleLookup = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
function difference(a, b) {
  const diff = a ^ b;
  return nibbleLookup[diff >> 4] + nibbleLookup[diff & 0xF];
}




function encodeCodebook(codebook) {
  const encodedCodeBook = [];
  for ( let i = 1; i <= codebook[codebook.length - 1][1].length; i++ ) {
    encodedCodeBook.push(codebook.filter(v => v[1].length == i).length);
  }
  return [encodedCodeBook.length, ...encodedCodeBook, ...codebook.map(([c]) => +c)];
}

function decodeCodebook(encoded) {
  const bitsLength = encoded[0];
  const codebook = [];
  let code = 0;
  let i = 1;
  for ( let bits = 1; bits <= bitsLength; bits++ ) {
    let numToGo = encoded[bits];
    while ( numToGo > 0 ) {
      codebook.push([encoded[bitsLength + i], code.toString(2).padStart(bits, '0')]);
      i += 1;
      numToGo -= 1;
      code += 1;
    }
    code <<= 1;
  }
  return codebook;
}




function encode(data, codebook, mappings = {}) {
  // Encode data using the codebook
  let bits;
  try {
    bits = data.map(v => codebook.find(c => c[0] == ''+(mappings[v] || v))[1]).join('');
  } catch(e) {
    throw `Can't find these values in the given codebook: ${
      data.filter((v, i) => data.indexOf(v) == i)
          .filter(v => !codebook.map(v => v[0]).includes(''+v))
          .join(', ')
    } (${e})`;
  }

  // Convert string of bits to array of bytes
  const encodedData = [];
  const missing = 8 - bits.length % 8;
  bits += '0'.repeat(missing);
  for ( let i = 0; i < bits.length; i += 8 ) {
    encodedData.push(parseInt(bits.substr(i, 8), 2));
  }

  // Done!
  return encodedData;
}

function decode(data, codebook) {
  // Decode the data using the codebook
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
      decoded.push(+codebook.find(v => v[1] == bits)[0]);
    bits = '';
  }
  return decoded;
}

function decodeOnTheFly(encodedCodebook, encodedData) {
  const decoded = [];
  let bitPointer = 0;
  let value0, value1, value2;
  while ( (bitPointer >> 3) < encodedData.length ) {
    value0 = encodedData[(bitPointer >> 3) + 0];
    value1 = encodedData[(bitPointer >> 3) + 1];
    value2 = encodedData[(bitPointer >> 3) + 2];
    for ( let shift = 0; shift < bitPointer % 8; shift++ ) {
      value0 <<= 1;
      value0 &= 0xFF;
      value0 |= (value1 & 128) ? 1 : 0;
      value1 <<= 1;
      value1 &= 0xFF;
      value1 |= (value2 & 128) ? 1 : 0;
      value2 <<= 1;
      value2 &= 0xFF;
    }
    const result = decodeByte(encodedCodebook, value0, value1);
    decoded.push(result[1]);
    bitPointer += result[0];
  }
  return decoded;
}

function decodeByte(encodedCodebook, value0, value1) {
  const bitsLength = encodedCodebook[0];
  const codebook = [];
  let code = 0;
  let i = 1;
  let mask0 = 128;
  let mask1 = 0;
  for ( let bits = 1; bits <= bitsLength; bits++ ) {
    let numToGo = encodedCodebook[bits];
    while ( numToGo > 0 ) {
      codebook.push([encodedCodebook[bitsLength + i], code.toString(2).padStart(bits, '0')]);
      const comparisonCode = code << (16 - bits);
      if ( (value0 & mask0) == (comparisonCode >> 8) && (value1 & mask1) == (comparisonCode & 0xFF) ) {
        return [bits, encodedCodebook[bitsLength + i]];
      }
      i += 1;
      numToGo -= 1;
      code += 1;
    }
    code <<= 1;

    // Fill up masks
    if ( mask0 < 0xFF ) {
      mask0 |= mask0 >> 1;
    } else if ( mask1 == 0 ) {
      mask1 = 128;
    } else {
      mask1 |= mask1 >> 1;
    }
  }
  console.log("Shouldn't get here, codebook:", codebook);
}




function encodeWithCodebook(data) {
  const codebook = createCodebook(data);
  return [...encodeCodebook(codebook), ...encode(data, codebook)];
}

function decodeWithCodebook(data) {
  const codebook = decodeCodebook(data);
  data = data.slice(data[0] + codebook.length + 1);
  return decode(data, codebook);
}




module.exports = {
  createCodebook,
  createLimitedCodebook,
  encode,
  decode,
  decodeOnTheFly,
  encodeCodebook,
  decodeCodebook,
  encodeWithCodebook,
  decodeWithCodebook,
  difference
};
