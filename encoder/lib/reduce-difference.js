const { byteDifference } = require('./helpers.js');

const cutOff = 2;   // Candidate bytes are bytes where only `cutOff` or fewer pixels are set
const remove = 0.33; // Remove a fraction of those candidate bytes randomly

// Given a diff image, throw out some of the difference to make it encode better
module.exports = {

  encode(data) {
    const candidates = data.map(b => b != 0 && byteDifference(0, b) <= cutOff);
    const numberOfCandidates = data.reduce((a,b) => a + (b ? 1 : 0), 0);
    const numberToRemove = Math.floor(numberOfCandidates * remove);
    const candidatesToRemove = candidates.map((c, i) => i)
                                         .filter((c, i) => candidates[i])
                                         .sort(() => Math.random() - 0.5)
                                         .slice(0, numberToRemove);

    return data.map((b, i) => candidatesToRemove.includes(i) ? 0 : b);
  },

  decode(data) {
    return data;
  }

};
