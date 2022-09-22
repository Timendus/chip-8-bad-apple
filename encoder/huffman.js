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
  return data.map(v => mapping[v]).join('');
}

function decode(data, tree) {
  const bits = data.split('');
  const decoded = [];
  let i = 0;
  while ( i < bits.length ) {
    let walker = tree;
    while ( !('value' in walker) ) {
      if ( bits[i] == '1' )
        walker = walker.right;
      else
        walker = walker.left;
      i += 1;
    }
    decoded.push(walker.value);
  }
  return decoded;
}

module.exports = {
  createTree,
  encode,
  decode
};
