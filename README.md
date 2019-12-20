# [![Tutorbook Logo](https://tutorbook.app/favicon/text-logo.png)](https://tutorbook.app)

[![Build Status](https://travis-ci.org/nicholaschiang/tutorbook.svg?branch=master)](https://travis-ci.org/nicholaschiang/tutorbook)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)
[![Maintainability](https://api.codeclimate.com/v1/badges/dd8c901f0077521d8f21/maintainability)](https://codeclimate.com/github/nicholaschiang/tutorbook/maintainability)
[![Coverage Status](https://coveralls.io/repos/github/nicholaschiang/tutorbook/badge.svg?branch=master)](https://coveralls.io/github/nicholaschiang/tutorbook?branch=master)
[![NPM version](https://badge.fury.io/js/%40tutorbook%2Fapp.svg)](https://badge.fury.io/js/%40tutorbook%2Fapp)

App designed to optimize the process required to get a student with a qualified tutor.

After discovering just how un-streamlined the current process is at the Gunn AC (academic center), I decided that it could be much more efficient through the use of technology. (Previously, one would have to manually fill out and turn in a request form to the office and then wait for the AC Staff to match the student with the tutor.)

Read more [about me](https://nicholaschiang.com) and view the open source code [here](https://github.com/nicholaschiang/tutorbook).

## Contributing

**We need help.** To contribute to [Tutorbook](https://tutorbook.app), either go
through our [issues](https://github.com/nicholaschiang/tutorbook/issues) or our
[Notion task page](https://www.notion.so/tutorbook/145daee9eb41405595f34955b50df281?v=5e0ac0e835cf4bb1929a371e9339d1f6)
to find something that you'd be interested in working on. Then, checkout from
`develop` and create a PR for whatever task you've been contributing to.

## GitFlow: Tutorbook's branching work flow

To ensure - as much as possible - the quality and correctness of our code, and
to enable many contributors to work on our apps at the same time without getting
in each other's way we use the GitFlow work flow [by Vincent Driessen](
http://nvie.com/posts/a-successful-git-branching-model/ "Original Blog post
'A successful Git branching model' by Vincent Driessen").

![GitFlow diagram](https://github.com/nicholaschiang/tutorbook/blob/master/docs/gitflow-diagram.png)

### Branches

**Unless explicitly stated otherwise (either here or by the branch's owner),
only a branch's creator may push changes to it.** Other developers may always
create pull requests to submit changes to the branch.

#### `develop`

`develop` is our main branch. It corresponds with the current work-in-progress
state of the app, that we deal with most often as developers.

`develop` is a protected branch and no commits can be pushed to it directly. The
only way to add features, fix bugs, and make other changes is through pull
requests that pass review and automated tests.

**`develop` should always be stable and ready for release**. Any features that
are merged only partially must be disabled in code or using a pre-compiler
directive so that they do not affect release builds.

#### Feature branches

Feature branches are branches created by developers based on `develop` which are
used to create new features, fix bugs, and make other changes to the app.

When a feature or change is done, it is merged into develop via a reviewed and
tested pull request.

#### `master`

`master` is the currently released state of the app. All changes to `master`
always result in a new release tag.

`master` is a protected branch and no commits can be pushed to it directly. The
only way to add features (merged from release branches), fix bugs (merged from
hotfix branches), and make other changes is through pull requests that pass
review and automated tests.

#### Release branches

Release branches are branched off of `develop` for the next release and tagged
with that corresponding release tag. Release branches should only contain
bugfixes that continously merged back into `develop`.

After a release branch has been thoroughly tested (i.e. no bugs), it is merged
into `master` and it's release tag becomes the currently released state of the
app.

#### Hotfix branches

Hotfix branches are branched off of `master` (the currently released state of
the app) for severe bug fixes (that are then merged back into `develop`).

Hotfix branches are then merged back into `master`, resulting in a new
maintenance version number.

#### Versioning

Our apps follows the following versioning scheme:

    major.minor[.maintenance]

- The `major` component is changed only upon special considerations.
- The `minor` component is incremented by one as the first commit of every release branch **(and in no other case)**. The same commit also removes the `maintenance` component.
- The `maintenance` is added and incremented by one as the first commit of every hot fix branch **(and in no other case)**.

In addition, there is also the build number which is not visible to the public and only used to distinguish different builds internally. This number is incremented automatically for most of our apps. If it is not, it should be incremented for each created release tag.

In essence, the versioning scheme can thus be thought of as:

    major.release[.hot_fix]

#### Releases

At any one time, there are three live states of the app: `gunn`, `paly`, and
`master`. `master` is what is seen at `tutorbook.app` and `www.tutorbook.app`. `gunn` is a customized
version of `master` for [Henry M. Gunn Senior High School](https://gunn.pausd.org).
`paly` is a customized version of `master` for the [Palo Alto Senior High
School](https://paly.pausd.org).

During a release, changes from a feature branch (based off of `develop`) are
merged into `master` after extensive testing and debugging. Once merged, those
changes become live at `tutorbook.app` and `www.tutorbook.app`.

We then take `master` and branch off to form two release branches to merge into
`gunn` and `paly`. After all necessary changes have been made to the code from
`master`, those release branches are merged into `gunn` and `paly`, resulting in
new releases at `gunn.tutorbook.app` and `paly.tutorbook.app`.

Thus, release tags are first seen in `master` after which they are transmuted to
`gunn` and `paly` after necessary changes are made (e.g. payments are removed,
supervisor code tweaked, etc).
