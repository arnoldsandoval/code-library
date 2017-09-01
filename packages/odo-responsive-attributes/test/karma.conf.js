const sharedConfig = require('../../../karma.conf.js');

module.exports = (config) => {
  sharedConfig(config);
  config.set({
    files: [
      'fixtures/*',
      '../../../node_modules/babel-polyfill/dist/polyfill.min.js',
      '../../../node_modules/chai/chai.js',
      '../../../node_modules/sinon/pkg/sinon.js',
      '../../odo-base-component/node_modules/tiny-emitter/dist/tinyemitter.min.js',
      '../../odo-base-component/dist/odo-base-component.min.js',
      '../src/responsive-attributes.js',
      'test.js',
    ],
  });
};
