const path = require('path');

module.exports = env => [{
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
    watch: env.development,
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
    watch: env.development,
}];