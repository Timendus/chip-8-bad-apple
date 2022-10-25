module.exports = {
  encode(data, width, oddEven) {
    return data.filter((v, i) =>
      Math.floor(i / (width / 8)) % 2 == oddEven);
  },

  decode(data, width, oddEven, previousFrame) {
    const widthInBytes = width / 8;
    return previousFrame.map((v, i) =>
      (Math.floor(i / widthInBytes) % 2 == oddEven)
        ? data[Math.floor(i / widthInBytes / 2) * widthInBytes + (i % widthInBytes)]
        : v
    );
  }
}
