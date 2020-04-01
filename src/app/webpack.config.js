const path = require('path');

/**
 * Our [webpack]{@link https://webpackjs.org} configuration.
 * @see {@link https://webpack.js.org/loaders/html-loader/#minimize}
 * @see {@link https://github.com/DanielRuf/html-minifier-terser}
 * @see {@link https://www.npmjs.com/package/svg-url-loader}
 * @see {@link https://webpack.js.org/loaders/babel-loader/}
 * @see {@link https://babeljs.io}
 */
module.exports = (env, argv) => {
  return {
    watch: argv.mode === 'development',
    devtool: argv.mode === 'development' ? 'eval-source-map' : 'none',
    entry: path.resolve(__dirname, 'packages/app/index.js'),
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, '../../build/app/'),
    },
    resolve: {
      extensions: ['.scss', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          options: {
            presets: ['@babel/env'],
            minified: argv.mode === 'production',
            comments: argv.mode !== 'production',
          },
        },
        {
          test: /\.s[ac]ss$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'sass-loader',
              options: {
                implementation: require('sass'),
                sassOptions: {
                  fiber: require('fibers'),
                  includePaths: [path.resolve(__dirname, 'node_modules')],
                },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.html$/,
          loader: 'html-loader',
          options: {
            esModule: true,
            minimize:
              argv.mode === 'production'
                ? {
                    collapseBooleanAttributes: true,
                    collapseWhitespace: true,
                    decodeEntities: true,
                    minifyCSS: true,
                    minifyJS: true,
                    quoteCharacter: '"',
                    removeComments: true,
                    removeOptionalTags: true,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    removeTagWhitespace: true,
                    sortAttributes: true,
                    sortClassName: true,
                    useShortDoctype: true,
                  }
                : false,
          },
        },
        {
          test: /\.svg$/,
          use: 'svg-url-loader',
        },
      ],
    },
  };
};
