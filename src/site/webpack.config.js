const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = (env, argv) => [{
    entry: './packages/site/index.js',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, '../../build/'),
    },
    module: {
        rules: [{
            test: /\.s[ac]ss$/i,
            use: ['to-string-loader', 'css-loader', 'sass-loader'],
        }, {
            test: /\.html$/i,
            use: ['to-string-loader', 'html-loader'],
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
    watch: argv.mode === 'development',
}, {
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
    watch: argv.mode === 'development',
}];