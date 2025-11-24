const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },

  module: {
    unknownContextCritical: false,   // ← lo incluimos aquí
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /chat\.js$/,
        parser: { system: true }
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html'
    })
  ],

  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    compress: true,
    port: 8080,
    hot: true
  },

  resolve: {
    extensions: ['.js'],
    fallback: {
      buffer: false,
      crypto: false,
      stream: false,
      util: false,
      path: false,
      fs: false,
      net: false,
      tls: false
    }
  },

  externals: {},

  performance: {
    hints: false
  },

  stats: {
    warnings: false
  },

  mode: 'development'
};
