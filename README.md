# [![Tutorbook Logo](https://raw.githubusercontent.com/tutorbookapp/tutorbook/develop/build/favicon/text-logo.png)](https://tutorbook.app)

[![Build Status](https://travis-ci.org/tutorbookapp/tutorbook.svg?branch=master)](https://travis-ci.org/tutorbookapp/tutorbook)
[![Website Status](https://img.shields.io/website?down_color=lightgrey&down_message=down&up_color=brightgreen&up_message=up&url=https%3A%2F%2Ftutorbook.app)](https://tutorbook.app)
[![NPM Version](https://badge.fury.io/js/%40tutorbook%2Fapp.svg)](https://npmjs.com/package/@tutorbook/app)
[![Maintainability](https://api.codeclimate.com/v1/badges/dd8c901f0077521d8f21/maintainability)](https://codeclimate.com/github/nicholaschiang/tutorbook/maintainability)
[![Dependencies](https://david-dm.org/tutorbookapp/tutorbook/status.svg)](https://david-dm.org/tutorbookapp/tutorbook)
[![License](https://img.shields.io/badge/license-CC%2FAGPL-blue)](https://github.com/tutorbookapp/tutorbook/blob/develop/LICENSE)
[![Lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)

A PWA (Progressive Web App) designed to optimize the process required to get a
student with a qualified tutor.

After discovering just how un-streamlined the existing process was at the Gunn
Academic Center, I decided it could be much more efficient through the use of
technology (previously, one would have to manually fill out and turn in a
request form to the office and then wait for the AC Staff to match the student
with the tutor). Now, Gunn and Paly students can request and message peer tutors
from anywhere at anytime, track service hours using a phone or a school-issued
laptop, hire professional at-home tutors when necessary, and connect with middle
school students all from within our web app.

Read more [about me](https://nicholaschiang.com) and view the open source code
[here](https://github.com/nicholaschiang/tutorbook).

## Contributing

**We need help.** To contribute to [Tutorbook](https://tutorbook.app), either go
through our [issues](https://github.com/nicholaschiang/tutorbook/issues) or our
[Notion task page](https://www.notion.so/tutorbook/145daee9eb41405595f34955b50df281?v=5e0ac0e835cf4bb1929a371e9339d1f6)
to find something that you'd be interested in working on. Then, checkout from
`develop` and create a PR for whatever task you've been contributing to.

### File Structure

#### Progressive Web App

Our progressive web app
([PWA](https://developers.google.com/web/progressive-web-apps/)) primarily
consists of 28 (and counting) [subpackages](https://npmjs.com/org/tutorbook)
(included in `src/app/packages`) managed by [lerna](https://lerna.js.org) that
are [webpacked](https://webpack.js.org) into three files for distribution
(included in `build/app`):

```
.
├── build
│   ├── app
│   │   ├── index.html
│   │   ├── index.js
│   │   ├── index.css
│   │   └── img
│   │       └── bot.png
│   └── favicon
│       └── manifest.json
└── src
    ├── lerna.json
    ├── package.json
    └── app
        ├── package.json
        ├── package-lock.json
        ├── webpack.config.js
        └── packages
            ├── app
            │   ├── index.js
            │   ├── package.json
            │   └── styles
            │       ├── cards.scss
            │       ├── chat.scss
            │       ├── profile.scss
            │       ├── search.css
            │       ├── user.css
            │       └── welcome.scss
            ├── dialogs
            │   ├── index.js
            │   └── package.json
            ├── render
            │   ├── index.js
            │   └── package.json
            └── templates
                ├── index.js
                ├── package.json
                └── templates.html
```

#### Marketing and Legalities Website

Our marketing and legalities website consists of 18 (and counting) subpackages
that define [Custom HTML Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements) that are used in `build/index.html`:

```
.
├── build
│   ├── favicon
│   │   └── manifest.json
│   ├── legal
│   │   └── index.html
│   ├── index.html
│   ├── index.js
│   └── index.css
└── src
    ├── lerna.json
    ├── package.json
    └── site
        ├── package.json
        ├── package-lock.json
        ├── webpack.config.js
        └── packages
            ├── site
            │   ├── index.js
            │   ├── index.scss
            │   └── package.json
            ├── styles
            │   ├── search.scss
            │   ├── reset.scss
            │   ├── general.scss
            │   └── package.json
            ├── legal
            │   ├── index.js
            │   ├── index.scss
            │   ├── index.html
            │   ├── package.json
            │   └── assets
            │       ├── html
            │       │   └── terms.html
            │       ├── md
            │       │   └── terms.md
            │       └── generate.js
            └── cta-link
                ├── index.js
                ├── index.scss
                ├── index.html
                ├── package.json
                └── templates.html
```

### Developing

To set up a development environment for and to contribute to the Tutorbook web
app:

1. Follow [these instructions](https://github.com/nvm-sh/nvm#installing-and-updating)
   to install `nvm` (our suggested way to use Node.js) on your
   machine. Verify that `nvm` is installed by running:

```
$ command -v nvm
```

2. Optionally (if you use [Vim](https://vim.org) as your preferred text editor),
   follow [these instructions](https://freshman.tech/vim-javascript/) on setting
   up [Vim](https://vim.org) for editing JavaScript.
3. Run the following command to install Node.js v10.10.0 (our current version):

```
$ nvm i 10.10
```

4. Ensure that you have recent versions of Node.js and it's package manager
   `npm` by running:

```
$ node -v
10.10.0
$ npm -v
6.13.3
```

5. Make sure that you have [Lerna](https://lerna.js.org) installed by running:

```
$ npm i -g lerna
```

6. Clone and `cd` into this repository locally by running:

```
$ git clone https://github.com/tutorbookapp/tutorbook.git && cd tutorbook/
```

7. Then, you'll most likely want to branch off of `develop` and `cd` into our
   [app packages](https://npmjs.com/org/tutorbook) by running:

```
$ git checkout -b $my_branch && cd src/app/packages
```

8. Follow the instructions included below to start a webpack development server
   (to see your updates affect the app live).
9. From there, `cd` into your desired package, make your changes, commit them to
   your branch off of `develop`, and open a PR on GitHub.

#### Start a Development Server

To [webpack](https://webpack.js.org/) the app packages and see your changes
live, run the following commands from `src/app/`:

```
$ lerna bootstrap
$ npm run dev
```

To start a development server, first install
[Google's Firebase CLI](https://firebase.google.com/docs/cli/) by running:

```
$ npm i -g firebase-tools
```

Then, run the following command from anywhere in the repository and visit
[http://localhost:5000/](http://localhost:5000/) to see your version of the app:

```
$ firebase serve --only hosting
```

**Note** that you might get an error that says you are unauthorized to acces our
Firebase project (`tutorbook-779d8`). If you do, that means that you haven't
been added and that you should message Nicholas Chiang ([@nicholaschiang on
GitHub](https://github.com/nicholaschiang) or
[via email](mailto:nicholas.h.chiang@gmail.com)).

#### Build for Production

To [webpack](https://webpack.js.org/) the app packages for production, run the
following commands from `src/app/` (this assumes that you've already installed
our dependencies and such):

```
$ npm run prod
```

#### Code Format

Tutorbook uses [Prettier](https://prettier.io/) to enforce consistent code formatting throughout the codebase.
A pre-commit hook is used to format changed files found on commit, however it is still recommended to install the Prettier plugin in your code editor to ensure consistent code style.

## Documentation

Our [documentation](https://tutorbook.app/docs) (what you're probably reading
right now) is automatically generated by [JSDoc 3](https://jsdoc.app/) using our
[Minami theme](https://github.com/tutorbookapp/minami).

To remove and re-generate our documentation, run the following from the root of
Tutorbook's repository (this assumes that you have [JSDoc](https://jsdoc.app/)
installed):

```
$ make dev
$ make docs
```

To update our [Algolia Docsearch](https://docsearch.algolia.com/) index, first
follow [these instructions](https://docsearch.algolia.com/docs/run-your-own) to
setup your machine (we do not include the `.env` file with our Algolia keys in
this repository for obvious security reasons) and then run:

```
$ sudo make search
```
