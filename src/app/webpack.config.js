const path = require('path');

module.exports = {
    watch: true,
    entry: path.resolve(__dirname, 'packages/app/index.js'),
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, '../../build/app/'),
    },
    module: {
        rules: [{
            test: /\.js$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env'],
                    plugins: ['@babel/plugin-transform-runtime'],
                },
            },
        }, {
            test: /\.s[ac]ss$/,
            use: ['style-loader', 'css-loader', {
                loader: 'sass-loader',
                options: {
                    implementation: require('sass'),
                    sassOptions: {
                        fiber: require('fibers'),
                        includePaths: ['node_modules'],
                    },
                },
            }],
        }, {
            test: /\.css$/,
            use: ['style-loader', 'css-loader'],
        }, {
            test: /\.html$/,
            use: 'html-loader',
        }, {
            test: /\.svg$/,
            use: 'svg-url-loader',
        }],
    },
};