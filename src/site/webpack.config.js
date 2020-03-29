const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = (env, argv) => [{
    watch: argv.mode === 'development',
    devtool: argv.mode === 'development' ? 'eval-source-map' : 'none',
    entry: path.resolve(__dirname, 'packages/site/index.js'),
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, '../../build/'),
    },
    resolve: {
        extensions: ['.scss', '.js'],
    },
    module: {
        rules: [{
            test: /\.s[ac]ss$/i,
            use: ['to-string-loader', 'css-loader', {
                loader: 'sass-loader',
                options: {
                    implementation: require('sass'),
                    sassOptions: {
                        fiber: require('fibers'),
                        includePaths: [ // TODO: See #52.
                            path.resolve(__dirname, 'packages/error-msg/' +
                                'node_modules'),
                            path.resolve(__dirname, 'node_modules'),
                        ],
                    },
                },
            }],
        }, {
            test: /\.html$/i,
            use: ['to-string-loader', {
                loader: 'html-loader',
                options: {
                    esModule: true,
                    minimize: argv.mode === 'production' ? {
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
                    } : false,
                },
            }],
        }, {
            test: /\.svg$/i,
            use: 'svg-url-loader',
        }],
    },
    optimization: {
        minimize: argv.mode === 'production',
        minimizer: [new TerserPlugin({
            extractComments: false,
            terserOptions: {
                output: {
                    comments: false,
                },
            },
        })],
    },
}, {
    watch: argv.mode === 'development',
    entry: './packages/site/index.scss',
    output: {
        filename: 'index.css.js', // TODO: Don't generate this unused JS file.
        path: path.resolve(__dirname, '../../build/'),
    },
    module: {
        rules: [{
            test: /\.s[ac]ss$/i,
            use: [{
                loader: 'file-loader',
                options: {
                    name: 'index.css',
                },
            }, {
                loader: 'extract-loader',
            }, {
                loader: 'css-loader',
            }, {
                loader: 'sass-loader',
            }],
        }],
    },
}];