Tutorbook.prototype.viewDashboard = function() {
    // TODO: Do we really want this type of top nav?
    var that = this;
    var headerEl = this.renderTemplate('back-toolbar', {
        showMenu: function() {
            var menu = mdc.menu.MDCMenu.attachTo(document.querySelector('#back-toolbar-menu'));
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
        back: function() {
            that.router.navigate('/');
        }
    });
    mdc.topAppBar.MDCTopAppBar.attachTo(headerEl.querySelector('.mdc-top-app-bar'));

    var mainEl = this.renderTemplate('dashboard-grid-view');

    this.replaceElement(document.querySelector('.header'), headerEl);
    this.replaceElement(document.querySelector('main'), mainEl);

    this.dashboardRenderer = {
        remove: function(doc, type) {
            var locationCardToDelete = mainEl.querySelector('#doc-' + doc.id);
            if (locationCardToDelete) {
                mainEl.querySelector('#cards').removeChild(locationCardToDelete.parentNode);
            }

            return;
        },
        display: function(doc, type) {
            var data = doc.data();
            data['.id'] = doc.id;

            if (type === 'requestsIn') {
                // TODO: Maybe add these attributes when the
                // request is initiated the first time (i.e. write
                // them to the database)
                data['subtitle'] = 'From ' + data.userName;
                data['summary'] = data.userName + ' requested you as a tutor for ' + data.subject + '.';
                data['go_to_user'] = function() {
                    that.router.navigate('/users/' + data.userEmail);
                };
                data['go_to_request'] = function() {
                    console.log("TODO: Implement full screen request dialog view");
                };
                data['cancel_request'] = function() {
                    console.log("TODO: Implement request canceling", data.id);
                };

                var el = that.renderTemplate('dashboard-request-in-card', data);
            } else if (type === 'requestsOut') {
                // TODO: Maybe add these attributes when the
                // request is initiated the first time (i.e. write
                // them to the database)
                data['subtitle'] = 'To ' + data.userName;
                data['summary'] = 'You requested ' + data.userName + ' as a tutor for ' + data.subject + '.';
                data['go_to_user'] = function() {
                    that.router.navigate('/users/' + data.userEmail);
                };
                data['go_to_request'] = function() {
                    console.log("TODO: Implement full screen request dialog view");
                };
                data['cancel_request'] = function() {
                    console.log("TODO: Implement request canceling", data.id);
                };

                var el = that.renderTemplate('dashboard-request-out-card', data);
            } else if (type === 'upcoming') {
                // TODO: Add upcoming card templates, etc.
                console.log("TODO: Implement upcoming cards in dashboard.");
            } else {
                console.error("Invalid type passed to dashboardRenderer:", type);
            }


            // Setting the id allows to locating the individual user card
            el.querySelector('.location-card').setAttribute('id', 'doc-' + doc.id);
            el.querySelector('.location-card').setAttribute('timestamp', data.timestamp);

            var mainListEl = mainEl.querySelector('#cards');
            // Add final render of card to the mainEl in order by timestamp
            // (By rendering all card types with the same renderer, we are able to 
            // sort all card types by timestamp)
            try {
                var existingLocationCard = mainEl.querySelector('#doc-' + doc.id);
            } catch (e) {
                // add
                console.warn('Caught ' + e + ' while querying for #doc-' + doc.id + ', adding card.');
                for (var i = 0; i < mainListEl.children.length; i++) {
                    var child = mainListEl.children[i];
                    var time = child.getAttribute('timestamp');
                    // If there is a request that was sent later (more recently)
                    // Then this request will appear right before that request
                    if (time && time > data.timestamp) {
                        break;
                    }
                }
                mainListEl.insertBefore(el, child);
                /*
                 *mainEl.querySelector('#cards').append(el);
                 */
            }
            if (existingLocationCard) {
                // modify
                existingLocationCard.parentNode.before(el);
                mainEl.querySelector('#cards').removeChild(existingLocationCard.parentNode);
            } else {
                // add
                for (var i = 0; i < mainListEl.children.length; i++) {
                    var child = mainListEl.children[i];
                    var time = child.getAttribute('timestamp');
                    // If there is a request that was sent later (more recently)
                    // Then this request will appear right before that request
                    if (time && time > data.timestamp) {
                        break;
                    }
                }
                mainListEl.insertBefore(el, child);
                /*
                 *mainEl.querySelector('#cards').append(el);
                 */
            }

            /*
             *mdc.autoInit(); // TODO: To increase speed, make this only
             */
            // enable MDCRipple animations on click

        },
        empty: function(type) {
            // TODO: Make this render a unique "no upcoming" el like GMail does
            // TODO: Only show empty screen when all card types show up empty
            /*
             *var noResultsEl = that.renderTemplate('no-results');
             *that.replaceElement(document.querySelector('main'), noResultsEl);
             */
            return;
        }
    };

    var id = firebase.auth().currentUser.email; // TODO: Actually use the uid
    // (By rendering all card types with the same renderer, we are able to 
    // sort all card types by timestamp)
    this.getDashboardData(id);

};