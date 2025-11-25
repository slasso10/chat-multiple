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
    unknownContextCritical: false,   
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
    port: 9000,  
    hot: true,
    open: true   
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
      http: false,    
      https: false,   
      os: false,      
      url: false,     
      zlib: false,    
      assert: false   
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
  devtool: 'source-map' 
};