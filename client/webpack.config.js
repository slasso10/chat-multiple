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
    unknownContextCritical: false,   // Para Ice.js
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
    port: 9000,  // ← CAMBIADO a 9000 para evitar conflicto con WebSocket (8080)
    hot: true,
    open: true   // Abre automáticamente el navegador
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
      tls: false,
      http: false,    // Agregado
      https: false,   // Agregado
      os: false,      // Agregado
      url: false,     // Agregado
      zlib: false,    // Agregado
      assert: false   // Agregado
    }
  },

  externals: {},

  performance: {
    hints: false
  },

  stats: {
    warnings: false
  },

  mode: 'development',
  devtool: 'source-map'  // Para debugging
};