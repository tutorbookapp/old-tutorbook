# Converting MD to HTML

To convert Notion-generated markdown (we use [Notion](https://notion.so) to edit
and host working copies of our legal policies and documentation) to site-ready
HTML, run the following commands from this directory:

```
$ npm i
$ cd assets/
$ node generate.js
```

## Outputs

Running `generate.js` should take all of the markdown files in `assets/md/*.md`
and generate their equivalent in HTML (i.e. `assets/html/*.html`).
