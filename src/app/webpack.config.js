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
            'index.css': [
                // SCSS files contain imports that regard that section of the app 
                // Main.scss contains imports that appear in multiple sections
                path.resolve(__dirname, 'packages/app/styles/main.scss'),
                path.resolve(__dirname, 'packages/app/styles/cards.scss'),
                path.resolve(__dirname, 'packages/app/styles/welcome.scss'),
                path.resolve(__dirname, 'packages/app/styles/dialogs.scss'),
                path.resolve(__dirname, 'packages/app/styles/settings.scss'),
                path.resolve(__dirname, 'packages/app/styles/schedule.scss'),
                path.resolve(__dirname, 'packages/app/styles/chat.scss'),
                path.resolve(__dirname, 'packages/app/styles/profile.scss'),
                path.resolve(__dirname, 'packages/app/styles/search.scss'),
                path.resolve(__dirname, 'packages/app/styles/ads.scss'),
                path.resolve(__dirname, 'packages/app/styles/dashboard.scss'),
                path.resolve(__dirname, 'packages/app/styles/snackbar.scss'),

                // All other styling files are contained as CSS files
                path.resolve(__dirname, 'packages/app/styles/loader.css'),
                path.resolve(__dirname, 'packages/app/styles/payments.css'),
                path.resolve(__dirname, 'packages/app/styles/clock.css'),
                path.resolve(__dirname, 'packages/app/styles/user.css'),
                path.resolve(__dirname, 'packages/app/styles/search.css'),
                path.resolve(__dirname, 'packages/app/styles/filters.css'),
                path.resolve(__dirname, 'packages/app/styles/history.css'),
                path.resolve(__dirname, 'packages/app/styles/matching.css'),
                path.resolve(__dirname, 'packages/app/styles/chats.css'),
            ]
        },
        output: {
            // This is necessary for webpack to compile, but we never reference this js file.
            filename: '[name]',
            path: path.resolve(__dirname, '../../build/app/'),
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
                }
            ]
        },
        plugins: [
            new ExtractTextPlugin('index.css'),
        ],
        watch: true,
    },
    {
        entry: {
            'index.js': [
                path.resolve(__dirname, 'packages/app/index.js'),
            ]
        },
        output: {
            filename: '[name]',
            path: path.resolve(__dirname, '../../build/app/'),
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