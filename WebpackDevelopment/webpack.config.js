const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'PennController.js',
    path: path.resolve(__dirname, 'dist/js_includes')
  }
};