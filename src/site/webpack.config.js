const path = require('path');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

function getStyleUse(bundleFilename) {
    return [{
            loader: 'file-loader',
            options: {
                name: bundleFilename,
            },
        }, {
            loader: 'extract-loader'
        },
        {
            loader: 'css-loader',
        },
        {
            loader: 'postcss-loader',
            options: {
                plugins: () => [autoprefixer()]
            }
        },
        {
            loader: 'sass-loader',
            options: {
                includePaths: ['./node_modules'],
            }
        }
    ];
}

module.exports = [{
        entry: {
            'bundle.min.css': [
                // SCSS files contain imports that regard that section of the app 
                // Main.scss contains imports that appear in multiple sections
                path.resolve(__dirname, 'styles/menu.scss'),
                path.resolve(__dirname, 'styles/search-results.scss'),

                // All other styling files are contained as CSS files
                path.resolve(__dirname, 'styles/search.css'),
                path.resolve(__dirname, 'styles/filters.css'),
                path.resolve(__dirname, 'styles/scroller.css'),
            ]
        },
        output: {
            // This is necessary for webpack to compile, but we never reference this js file.
            filename: '[name]',
            path: path.resolve(__dirname, '../../build/site/styles/'),
        },
        module: {
            rules: [{
                    test: /\.scss$/,
                    use: ExtractTextPlugin.extract({
                        use: [{
                                loader: 'css-loader',
                            },
                            {
                                loader: 'sass-loader',
                                options: {
                                    includePaths: [path.resolve(__dirname, 'node_modules/')]
                                }
                            }
                        ],
                    })
                },
                {
                    test: /\.css$/,
                    use: ExtractTextPlugin.extract({
                        use: [{
                            loader: 'css-loader',
                        }]
                    })
                },
                {
                    test: /\.(png|jpg)$/,
                    loader: 'url-loader'
                }
            ]
        },
        plugins: [
            new ExtractTextPlugin("bundle.min.css"),
        ],
        watch: true,
    },
    {
        entry: {
            'bundle.min.js': [
                path.resolve(__dirname, 'scripts/menu.js'),
                path.resolve(__dirname, 'scripts/search.js'),
                path.resolve(__dirname, 'scripts/search-animation.js'),
            ]
        },
        output: {
            filename: '[name]',
            path: path.resolve(__dirname, '../../build/site/scripts/'),
        },
        module: {
            rules: [{
                test: /\.js$/,
                use: [{
                    loader: 'babel-loader',
                    options: {
                        presets: ['es2015']
                    },
                }],
            }]
        },
        watch: true,
    }
];