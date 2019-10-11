'use strict';
Tutorbook.prototype.initTemplates = function() {
    this.templates = {};

    var that = this;
    document.querySelectorAll('.template').forEach(function(el) {
        that.templates[el.getAttribute('id')] = el;
    });
};

Tutorbook.prototype.viewLoader = function() {
    this.initTemplates();

    var loaderEl = this.renderTemplate('loader');

    this.replaceElement(document.querySelector('main'), loaderEl);
};

Tutorbook.prototype.renderTemplate = function(id, data) {
    var template = this.templates[id];
    var el = template.cloneNode(true);
    el.removeAttribute('hidden');
    this.render(el, data);
    return el;
};

Tutorbook.prototype.render = function(el, data) {
    if (!data) {
        return;
    }

    var that = this;
    var modifiers = {
        'data-fir-foreach': function(tel) {
            var field = tel.getAttribute('data-fir-foreach');
            console.log("Getting values for data-fir-foreach with field", field);
            var values = that.getDeepItem(data, field);

            values.forEach(function(value, index) {
                var cloneTel = tel.cloneNode(true);
                tel.parentNode.append(cloneTel);

                Object.keys(modifiers).forEach(function(selector) {
                    var children = Array.prototype.slice.call(
                        cloneTel.querySelectorAll('[' + selector + ']')
                    );
                    children.push(cloneTel);
                    children.forEach(function(childEl) {
                        var currentVal = childEl.getAttribute(selector);

                        if (!currentVal) {
                            return;
                        }
                        childEl.setAttribute(
                            selector,
                            currentVal.replace('~', field + '/' + index)
                        );
                    });
                });
            });

            tel.parentNode.removeChild(tel);
        },
        'data-fir-content': function(tel) {
            var field = tel.getAttribute('data-fir-content');
            tel.innerText = that.getDeepItem(data, field);
        },
        'data-fir-click': function(tel) {
            tel.addEventListener('click', function() {
                var field = tel.getAttribute('data-fir-click');
                that.getDeepItem(data, field)();
            });
        },
        'data-fir-click-this': function(tel) {
            tel.addEventListener('click', function() {
                var field = tel.getAttribute('data-fir-click-this');
                that.getDeepItem(data, field)(that);
            });
        },
        'data-fir-if': function(tel) {
            var field = tel.getAttribute('data-fir-if');
            if (!that.getDeepItem(data, field)) {
                tel.style.display = 'none';
            }
        },
        'data-fir-if-not': function(tel) {
            var field = tel.getAttribute('data-fir-if-not');
            if (that.getDeepItem(data, field)) {
                tel.style.display = 'none';
            }
        },
        'data-fir-attr': function(tel) {
            var chunks = tel.getAttribute('data-fir-attr').split(':');
            var attr = chunks[0];
            var field = chunks[1];
            tel.setAttribute(attr, that.getDeepItem(data, field));
        },
        'data-fir-style': function(tel) {
            var chunks = tel.getAttribute('data-fir-style').split(':');
            var attr = chunks[0];
            var field = chunks[1];
            var value = that.getDeepItem(data, field);

            if (attr.toLowerCase() === 'backgroundimage') {
                value = 'url(' + value + ')';
            }
            tel.style[attr] = value;
        }
    };

    var preModifiers = ['data-fir-foreach'];

    preModifiers.forEach(function(selector) {
        var modifier = modifiers[selector];
        that.useModifier(el, selector, modifier);
    });

    Object.keys(modifiers).forEach(function(selector) {
        if (preModifiers.indexOf(selector) !== -1) {
            return;
        }

        var modifier = modifiers[selector];
        that.useModifier(el, selector, modifier);
    });
};

Tutorbook.prototype.useModifier = function(el, selector, modifier) {
    el.querySelectorAll('[' + selector + ']').forEach(modifier);
};

Tutorbook.prototype.getDeepItem = function(obj, path) {
    path.split('/').forEach(function(chunk) {
        obj = obj[chunk];
    });
    return obj;
};

Tutorbook.prototype.renderRating = function(rating) {
    var el = this.renderTemplate('rating', {});
    for (var r = 0; r < 5; r += 1) {
        var star;
        if (r < Math.floor(rating)) {
            star = this.renderTemplate('star-icon', {});
        } else {
            star = this.renderTemplate('star-border-icon', {});
        }
        el.append(star);
    }
    return el;
};

Tutorbook.prototype.replaceElement = function(parent, content) {
    parent.innerHTML = '';
    parent.append(content);
};

Tutorbook.prototype.rerender = function() {
    this.router.navigate(document.location.pathname + '?' + new Date().getTime());
};