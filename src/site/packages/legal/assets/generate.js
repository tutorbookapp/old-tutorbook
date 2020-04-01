// Goes through Markdown where:
// - Heading 1 => Policy Title (terms__policy-title)
// - Bold (after Heading 1) => Effective Date (terms__effective-date)
// - Heading 2 => Policy Subheading (terms__policy-subheading)

const ask = false; // Whether or not to ask for custom subsection IDs.
const fs = require('fs');
const md = require('markdown-it')();
const readline = require('readline-sync');

const find = (token) =>
  parsed.findIndex((t) => {
    for (var [key, val] of Object.entries(t)) {
      var check = token[key] === val;
      if (val instanceof Array) check = val.equals(token[key]);
      if (!check) return false;
    }
    return true;
  });

Array.prototype.equals = function (array) {
  if (!array) return false;
  if (this.length != array.length) return false;
  for (var i = 0, l = this.length; i < l; i++) {
    if (this[i] instanceof Array && array[i] instanceof Array) {
      if (!this[i].equals(array[i])) return false;
    } else if (this[i] != array[i]) {
      return false;
    }
  }
  return true;
};

md.renderer.rules.heading_open = (tokens, idx, opts, env, slf) => {
  const token = tokens[idx];
  if (token.tag === 'h1') {
    global.title = parsed[find(token) + 1].content;
    return '<div class="terms__policy-title">';
  }
  if (token.tag === 'h2') {
    const match = find(token);
    const title = parsed[match + 1].content;
    const id =
      match < 0
        ? 'todo'
        : ask
        ? readline.question(
            'What should ' + 'the id be for "' + title + '"? #' + policyId + '_'
          )
        : title
            .toLowerCase()
            .split(' ')
            .filter((s) => !/^\d+\./.test(s))
            .join('-');
    navItems[policyId + '_' + id] = title;
    return (
      '</div><div id="' +
      policyId +
      '_' +
      id +
      '"><div class=' +
      '"sp__2"></div><div class="terms__policy-heading">'
    );
  }
  if (token.tag === 'h3') return '<div class="terms__policy-subheading">';
  console.warn('[WARNING] Unsupported header tag (' + tokens[idx].tag + ').');
  return '';
};

md.renderer.rules.heading_close = (tokens, idx) => '</div>';

md.renderer.rules.paragraph_open = (tokens, idx, opts, env, slf) => {
  const index = find(tokens[idx]);
  if (index < 0) return slf.renderToken(tokens, idx);
  if (parsed[index + 1].content.indexOf('Effective day') >= 0) return '';
  return slf.renderToken(tokens, idx);
};

md.renderer.rules.paragraph_close = (tokens, idx, opts, env, slf) => {
  const index = find(tokens[idx]);
  if (index < 0) return slf.renderToken(tokens, idx);
  if (parsed[index - 1].content.indexOf('Effective day') >= 0) return '';
  return slf.renderToken(tokens, idx);
};

md.renderer.rules.strong_open = (tokens, idx, opts, env, slf) => {
  if (tokens.length < 3) return slf.renderToken(tokens, idx);
  if (tokens[idx + 1].content.indexOf('Effective day') >= 0)
    return '<div' + ' class="terms__effective-day"><div class="sp__1"></div>';
  return slf.renderToken(tokens, idx);
};

md.renderer.rules.strong_close = (tokens, idx, opts, env, slf) => {
  if (tokens.length < 3) return slf.renderToken(tokens, idx);
  if (tokens[idx - 1].content.indexOf('Effective day') >= 0)
    return '</' + 'div><div class="sp__2"></div><div>';
  return slf.renderToken(tokens, idx);
};

fs.readdir('md', (e, filenames) => {
  if (e) return console.error('[ERROR] Could not read input dir b/c of', e);
  var result =
    '<div class="terms__main"><div id="selected-policy" class="' +
    'u__hidden" data-policy="terms"></div><div class="sp__6"></div><div ' +
    'class="terms__header"><h1 class="terms__title">Terms &amp; Policies' +
    '</h1></div><div class="hr u__hidden--sm u__hidden--md"></div><div ' +
    'class="sp__6 u__hidden--sm u__hidden--md"></div><div class="u__flex ' +
    'u__flex-column--sm u__flex-column--md"><div class="terms__sidebar ' +
    'closed"><div class="terms__nav"><div class="terms__mobile-nav-header' +
    ' u__hidden--lg u__hidden--xlg"><div class="terms__nav-heading" data-' +
    'policy="terms">Terms of Service</div></div><ul class="terms__nav-' +
    'list">';
  var content =
    '</ul><div class="terms__back-link u__hidden"><div class="' +
    'sp__5 u__hidden u__visible--sm"></div>Back to Terms &amp; Policies' +
    '<div class="sp__4 u__hidden u__visible--sm"></div></div></div></div>' +
    '<div class="terms__content" style="margin-top: 0px;">';
  var index = 0;
  filenames.forEach((filename) => {
    const input = fs.readFileSync('md/' + filename).toString();
    global.parsed = md.parse(input);
    global.policyId = filename.replace('.md', '');
    global.navItems = {}; // Policy headers to add to the nav-list
    const output =
      '<div class="terms__article' +
      (index !== 0 ? ' u__hidden' : '') +
      '" data-policy="' +
      policyId +
      '">\n' +
      md.render(input) +
      '</div></div>';
    var menu =
      '<li data-policy="' +
      policyId +
      '" class="terms__policy-' +
      'nav ' +
      (index !== 0 ? 'collapsed' : 'selected') +
      '"><div class' +
      '="terms__nav-heading" data-policy="' +
      policyId +
      '">' +
      title +
      '</div><div class="terms__nav-subheadings"><div class="sp__1"></' +
      'div><ul>';
    Object.entries(navItems).forEach(
      ([id, title]) =>
        (menu +=
          '<li><a ' +
          'href="#' +
          id +
          '" data-scroll="true">' +
          title +
          '</a></li>')
    );
    menu += '</ul></div></li>';
    result += menu;
    content += output;
    fs.writeFileSync('html/' + policyId + '.html', output);
    fs.writeFileSync('html/' + policyId + '-menu.html', menu);
    console.log(
      '[DEBUG] Converted ' +
        filename +
        ' to and generated menu' +
        ' list in HTML.'
    );
    index++;
  });
  result += content;
  result +=
    '</div></div><div class="sp__2"></div></div><div class="sp__9">' +
    '</div><div class="hr"></div>';
  fs.writeFileSync('html/index.html', result);
});
