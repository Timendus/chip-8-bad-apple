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

function createMapping(node, bits='') {
  if ( 'value' in node )
    return [[node.value, bits]];
  return [
    ...createMapping(node.left, bits + '0'),
    ...createMapping(node.right, bits + '1')
  ];
}

function encode(data, tree) {
  const mapping = createMapping(tree).reduce((a, [k, v]) => {
    a[k] = v;
    return a;
  }, {});
  let bits = data.map(v => mapping[v]).join('');
  const result = [];
  const missing = 8 - bits.length % 8;
  bits += '0'.repeat(missing);
  for ( let i = 0; i < bits.length; i += 8 ) {
    result.push(parseInt(bits.substr(i, 8), 2));
  }
  return result;
}

function decode(data, tree) {
  const decoded = [];
  let i = 0;
  let m = 128;
  while ( i < data.length ) {
    let walker = tree;
    while ( i < data.length && !('value' in walker) ) {
      if ( (data[i] & m) != 0 )
        walker = walker.right;
      else
        walker = walker.left;
      m >>= 1;
      if ( m == 0 ) {
        i += 1;
        m = 128;
      }
    }
    decoded.push(+walker.value);
  }
  return decoded;
}

module.exports = {
  createTree,
  encode,
  decode
};
