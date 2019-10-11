Tutorbook.prototype.viewHome = function() {
    this.getAllUsers(this.renderer);
};

Tutorbook.prototype.initNavDrawer = function() {
    var that = this;
    that.navigation.drawer = mdc.drawer.MDCDrawer.attachTo(document.querySelector('.mdc-drawer'));

    var destinations = {
        showHome: function(that) {
            that.filters = {
                grade: '',
                subject: '',
                gender: '',
                type: '',
                sort: 'Rating'
            };

            that.updateQuery(that.filters);
        },
        showTutors: function(that) {
            that.filters.type = 'Tutor';
            that.updateQuery(that.filters);
        },
        showPupils: function(that) {
            that.filters.type = 'Pupil';
            that.updateQuery(that.filters);
        },
        showAppts: function() {
            console.log("TODO: Implement appointment view");
        },
        showProfile: function(that) {
            that.router.navigate('/profile');
        },
        showMessages: function(that) {
            that.router.navigate('/messages');
        },
        showSettings: function() {
            console.log("TODO: Implement settings view");
        },
        showHelp: function() {
            console.log("TODO: Implement help view");
        }
    }

    var navListEl = that.renderTemplate('nav-drawer-list', destinations);
    var drawerEl = document.querySelector('#nav-drawer');
    var navList = navListEl.querySelector('.mdc-list');

    that.replaceElement(drawerEl.querySelector('.mdc-drawer__content'), navList);
};

Tutorbook.prototype.initFilterDialog = function() {
    // TODO: Reset filter dialog to init state on close.
    this.dialogs.filter = new mdc.dialog.MDCDialog(document.querySelector('#dialog-filter-all'));
    this.dialogs.filter.autoStackButtons = false;

    var that = this;
    this.dialogs.filter.listen('MDCDialog:closing', function(event) {
        if (event.detail.action == 'accept') {
            that.updateQuery(that.filters);
        }
    });

    var dialog = document.querySelector('#dialog-filter-all');
    var pages = dialog.querySelectorAll('.page');

    this.replaceElement(
        dialog.querySelector('#grade-list'),
        this.renderTemplate('item-list', {
            items: ['Any'].concat(this.data.grades)
        })
    );

    this.replaceElement(
        dialog.querySelector('#subject-list'),
        this.renderTemplate('item-list', {
            items: ['Any'].concat(this.data.subjects)
        })
    );

    this.replaceElement(
        dialog.querySelector('#gender-list'),
        this.renderTemplate('item-list', {
            items: ['Any'].concat(this.data.genders)
        })
    );

    var renderAllList = function() {
        that.replaceElement(
            dialog.querySelector('#all-filters-list'),
            that.renderTemplate('all-filters-list', that.filters)
        );

        dialog.querySelectorAll('#page-all .mdc-list-item').forEach(function(el) {
            el.addEventListener('click', function() {
                var id = el.id.split('-').slice(1).join('-');
                displaySection(id);
            });
        });
    };

    var displaySection = function(id) {
        that.dialogs.filter.layout();
        if (id === 'page-all') {
            renderAllList();
        }

        pages.forEach(function(sel) {
            if (sel.id === id) {
                sel.style.display = 'inherit';
            } else {
                sel.style.display = 'none';
            }
        });
    };

    pages.forEach(function(sel) {
        var type = sel.id.split('-')[1];
        if (type === 'all') {
            return;
        }

        sel.querySelectorAll('.mdc-list-item').forEach(function(el) {
            el.addEventListener('click', function() {
                var newVal = el.innerText.trim() === 'Any' ? '' : el.innerText.trim();
                console.log("Updating filter " + type + " to be " + newVal + "...");
                that.filters[type] = newVal;
                displaySection('page-all');
            });
        });
    });

    displaySection('page-all');
    dialog.querySelectorAll('.back').forEach(function(el) {
        el.addEventListener('click', function() {
            displaySection('page-all');
        });
    });
};

Tutorbook.prototype.updateQuery = function(filters) {
    var query_description = '';

    if (filters.gender !== '') {
        query_description += filters.gender.toLowerCase() + ' ';
    }

    if (filters.grade !== '') {
        query_description += this.getGradeString(filters.grade).toLowerCase();
    } else {
        query_description += 'users';
    }

    if (filters.subject !== '') {
        query_description += ' with ' + filters.subject;
    } else {
        query_description += ' with any subject';
    }

    if (filters.type !== '') {
        query_description += ' who are ' + filters.type.toLowerCase() + 's';
    }

    if (filters.sort === 'Rating') {
        query_description += ' sorted by rating';
    } else if (filters.sort === 'Reviews') {
        query_description += ' sorted by # of reviews';
    }

    this.viewList(filters, query_description);
};

Tutorbook.prototype.viewList = function(filters, filter_description) {
    // TODO: Only display relevant subjects
    // (i.e. proficientStudy for Tutors and neededStudy for Pupils)
    if (!filter_description) {
        filter_description = 'users with any subject sorted by rating.';
    }

    var mainEl = this.renderTemplate('main-adjusted');
    var headerEl = this.renderTemplate('header-base', {
        hasSectionHeader: true,
        showMenu: function() {
            var menu = mdc.menu.MDCMenu.attachTo(document.querySelector('#menu'));
            if (menu.open) {
                menu.open = false;
            } else {
                menu.open = true;
            }
        },
        signOut: function() {
            firebase.auth().signOut();
        },
        showSettings: function() {
            console.log("TODO: Implement settings view");
        },
        showNav: function() {
            drawer = mdc.drawer.MDCDrawer.attachTo(document.querySelector('#nav-drawer'));
            drawer.open = true;

        }
    });
    mdc.topAppBar.MDCTopAppBar.attachTo(headerEl.querySelector('.mdc-top-app-bar'));

    this.replaceElement(
        headerEl.querySelector('#section-header'),
        this.renderTemplate('filter-display', {
            filter_description: filter_description,
            showFilterDialog: function(that) {
                that.dialogs.filter.open();
            },
            clearFilters: function(that) {
                that.filters = {
                    grade: '',
                    subject: '',
                    gender: '',
                    type: '',
                    sort: 'Rating'
                };
                that.rerender();
            }
        }));

    this.replaceElement(document.querySelector('.header'), headerEl);
    this.replaceElement(document.querySelector('main'), mainEl);

    mdc.ripple.MDCRipple.attachTo(headerEl.querySelector('#nav-button i'));
    mdc.ripple.MDCRipple.attachTo(headerEl.querySelector('#menu-button i'));

    var that = this;
    this.renderer = {
        remove: function(doc) {
            var locationCardToDelete = mainEl.querySelector('#doc-' + doc.id);
            if (locationCardToDelete) {
                mainEl.querySelector('#cards').removeChild(locationCardToDelete.parentNode);
            }

            return;
        },
        display: function(doc) {
            var data = doc.data();
            data['.id'] = doc.id;
            data['go_to_user'] = function() {
                that.router.navigate('/users/' + doc.id);
            };

            var el = that.renderTemplate('user-card', data);
            that.replaceElement(el.querySelector('.rating__meta'), that.renderRating(data.avgRating));
            // Setting the id allows to locating the individual user card
            el.querySelector('.location-card').id = 'doc-' + doc.id;
            try {
                var existingLocationCard = mainEl.querySelector('#doc-' + doc.id);
            } catch (e) {
                // add
                /*
                 *console.warn('Caught ' + e + ' while querying for #doc-' + doc.id + ', adding card.');
                 */
                mainEl.querySelector('#cards').append(el);
            }
            if (existingLocationCard) {
                // modify
                existingLocationCard.parentNode.before(el);
                mainEl.querySelector('#cards').removeChild(existingLocationCard.parentNode);
            } else {
                // add
                mainEl.querySelector('#cards').append(el);
            }
            mdc.ripple.MDCRipple.attachTo(el.querySelector('.mdc-list-item'));
        },
        empty: function() {
            var noResultsEl = that.renderTemplate('no-results');

            that.replaceElement(document.querySelector('main'), noResultsEl);
            return;
        }
    };

    if (filters.grade || filters.subject || filters.gender || filters.type || filters.sort !== 'Rating') {
        this.getFilteredUsers({
            grade: filters.grade || 'Any',
            subject: filters.subject || 'Any',
            gender: filters.gender || 'Any',
            type: filters.type || 'Any',
            sort: filters.sort
        }, this.renderer);
    } else {
        this.getAllUsers(this.renderer);
    }
};