// Stencil CLI build hook; no asset pipeline is needed yet.
module.exports = {
  development() {},
  production(done) {
    done();
  },
};
