import path from 'path';

export default {
  entry: './js/app.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve('static/js'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  mode: 'development',
  devtool: "source-map"
};
