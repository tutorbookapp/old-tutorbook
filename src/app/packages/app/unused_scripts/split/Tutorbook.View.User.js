Tutorbook.prototype.viewUser = function(id) {
    var mainEl;
    var sectionHeaderEl;
    var userDocument;

    var that = this;
    sectionHeaderEl = that.renderTemplate('back-toolbar', {
        showMenu: function() {
            var menu = mdc.menu.MDCMenu.attachTo(document.querySelector('#back-toolbar-menu'));
            menu.root_.querySelectorAll('.mdc-list-item').forEach(function(el) {
                mdc.ripple.MDCRipple.attachTo(el);
            });
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
    mdc.topAppBar.MDCTopAppBar.attachTo(sectionHeaderEl.querySelector('.mdc-top-app-bar'));

    return this.getUser(id)
        .then(function(doc) {
            var data = doc.data();
            userDocument = doc;
            mainEl = that.renderTemplate('user-list-view', data);

            if (data.type == 'Tutor') {
                return userDocument.ref.collection('proficientStudies').get();
            } else {
                return userDocument.ref.collection('neededStudies').get();
            }

        })
        .then(function(studies) {
            // Iterate over every study found in studies
            // and add a list item for every one
            // If there are no studies found, do not show list at all
            // (i.e. don't append it to mainEl)
            var title = userDocument.data().type + " for"
            var studiesEl = that.renderTemplate('studies', {
                title: title
            });

            // Make a list of studies for rendering request dialog
            var validStudies = [];
            if (studies.size) {
                studies.forEach(function(study) {
                    validStudies.push(study.data().name);
                });
            }

            // TODO: Only show a list of valid timeslots for requests
            var getTimes = function(minutesInterval, startTime) {
                var x = minutesInterval; //minutes interval
                var times = []; // time array
                var tt = startTime; // start time
                var ap = ['AM', 'PM']; // AM-PM

                //loop to increment the time and push results in array
                for (var i = 0; tt < 24 * 60; i++) {
                    var hh = Math.floor(tt / 60); // getting hours of day in 0-24 format
                    var mm = (tt % 60); // getting minutes of the hour in 0-55 format
                    times[i] = ("0" + (hh % 12)).slice(-2) + ':' + ("0" + mm).slice(-2) + ap[Math.floor(hh / 12)]; // pushing data in array in [00:00 - 12:00 AM/PM format]
                    tt = tt + x;
                }
                return times;
            }
            var validTimes = getTimes(30, 0);


            if (studies.size) {
                studies.forEach(function(study) {
                    var data = study.data();
                    var dialog = that.dialogs.request_user;
                    data.show_request_dialog = function() {
                        // TODO: Only set this data once the request button has been hit
                        that.currentRequest.toUserEmail = userDocument.data().email;
                        that.currentRequest.toUserName = userDocument.data().name;
                        that.currentRequest.subject = data.name;

                        that.viewRequestDialog();
                        /*
                         *var pathname = that.getCleanPath(document.location.pathname);
                         *that.router.navigate('/request/' + pathname);
                         */
                        /*
                         *                        // Reset the state before showing the dialog
                         *
                         *                        // Only show valid studies and timeslots
                         *                        that.replaceElement(
                         *                            dialog.root_.querySelector('#subject-list'),
                         *                            that.renderTemplate('item-list', {
                         *                                items: validStudies,
                         *                            })
                         *                        );
                         *                        that.replaceElement(
                         *                            dialog.root_.querySelector('#time-list'),
                         *                            that.renderTemplate('item-list', {
                         *                                items: validTimes,
                         *                            })
                         *                        );
                         *
                         *                        // Update currentRequest to match selected subject
                         *                        that.currentRequest.subject = data.name;
                         *
                         *                        that.initRequestDialog(false);
                         *                        dialog.open();
                         */
                    }
                    var el = that.renderTemplate('subject-card', data);
                    that.replaceElement(el.querySelector('.rating__meta'), that.renderRating(data.avgRating));
                    studiesEl.querySelector('#study-cards').append(el);
                });
                studiesEl.querySelectorAll('.mdc-list-item').forEach((el) => {
                    mdc.ripple.MDCRipple.attachTo(el);
                });
                mainEl.querySelector('#user-info').append(studiesEl);

                return userDocument.ref.collection('ratings').orderBy('timestamp', 'desc').get();
            }
        })
        .then(function(ratings) {
            var ratingsEl;
            var dialog = that.dialogs.add_review;
            var reviewActions = {
                show_add_review: function() {
                    // Reset the state before showing the dialog            
                    dialog.root_.querySelector('#text').value = '';
                    dialog.root_.querySelectorAll('.star-input i').forEach(function(el) {
                        el.innerText = 'star_border';
                    });

                    dialog.open();
                },
                add_mock_data: function() {
                    that.addMockRatings(id).then(function() {
                        that.rerender();
                    });
                }
            };

            if (ratings.size) {
                ratingsEl = that.renderTemplate('user-reviews', reviewActions);

                ratings.forEach(function(rating) {
                    var data = rating.data();
                    var el = that.renderTemplate('review-card', data);
                    that.replaceElement(el.querySelector('.rating__meta'), that.renderRating(data.rating));
                    ratingsEl.querySelector('#review-cards').append(el);
                });
            } else {
                ratingsEl = that.renderTemplate('no-reviews', reviewActions);
            }
            mainEl.querySelector('#user-info').append(ratingsEl);
        })
        /*
         *        .then(function() {
         *            // TODO: Only initialize the requestDialog once for each user window
         *
         *            // TODO: Maybe keep validStudies in the database as a user attribute
         *            // Make a list of studies for rendering request dialog
         *            var validStudies = [];
         *            if (studies.size) {
         *                studies.forEach(function(study) {
         *                    validStudies.push(study.data().name);
         *                });
         *            }
         *
         *            // TODO: Only show a list of valid timeslots for requests
         *            var getTimes = function(minutesInterval, startTime) {
         *                var x = minutesInterval; //minutes interval
         *                var times = []; // time array
         *                var tt = startTime; // start time
         *                var ap = ['AM', 'PM']; // AM-PM
         *
         *                //loop to increment the time and push results in array
         *                for (var i = 0; tt < 24 * 60; i++) {
         *                    var hh = Math.floor(tt / 60); // getting hours of day in 0-24 format
         *                    var mm = (tt % 60); // getting minutes of the hour in 0-55 format
         *                    times[i] = ("0" + (hh % 12)).slice(-2) + ':' + ("0" + mm).slice(-2) + ap[Math.floor(hh / 12)]; // pushing data in array in [00:00 - 12:00 AM/PM format]
         *                    tt = tt + x;
         *                }
         *                return times;
         *            }
         *            var validTimes = getTimes(30, 0);
         *
         *            var data = {}
         *            var dialog = that.dialogs.request_user;
         *            data.show_request_dialog = function() {
         *                // Reset the state before showing the dialog
         *
         *                // Only show valid studies and timeslots
         *                that.replaceElement(
         *                    dialog.root_.querySelector('#subject-list'),
         *                    that.renderTemplate('item-list', {
         *                        items: validStudies,
         *                    })
         *                );
         *                that.replaceElement(
         *                    dialog.root_.querySelector('#time-list'),
         *                    that.renderTemplate('item-list', {
         *                        items: validTimes,
         *                    })
         *                );
         *
         *                that.initRequestDialog();
         *                dialog.open();
         *            }
         *
         *            // Append user buttons as the last list item
         *            var buttonsEl = that.renderTemplate('user-actions', data);
         *            mainEl.querySelector('#user-info').append(buttonsEl);
         *        })
         */
        .then(function() {
            // Replace the current view with the final renders
            that.replaceElement(document.querySelector('.header'), sectionHeaderEl);
            that.replaceElement(document.querySelector('main'), mainEl);

        }).then(function() {
            that.router.updatePageLinks();
        })
        .catch(function(err) {
            console.warn('Error rendering page', err);
        });
};

Tutorbook.prototype.initRequestDialog = function(firstTime) {
    var dialog = document.querySelector('#dialog-request-user');
    var pages = dialog.querySelectorAll('.page');
    this.dialogs.request_user = new mdc.dialog.MDCDialog(dialog);
    this.dialogs.request_user.autoStackButtons = false;

    var that = this;

    if (firstTime) {
        this.dialogs.request_user.listen('MDCDialog:closing', function(event) {
            if (event.detail.action == 'accept') {
                console.log("Adding user request...");
                var pathname = that.getCleanPath(document.location.pathname);
                var id = pathname.split('/')[2];

                if (that.currentRequest.message) {
                    that.addRequest(id, {
                        subject: that.currentRequest.subject,
                        message: that.currentRequest.message,
                        time: that.currentRequest.time,
                        userName: firebase.auth().currentUser.displayName,
                        userID: firebase.auth().currentUser.uid,
                        userPhoto: firebase.auth().currentUser.photoURL,
                        userEmail: firebase.auth().currentUser.email,
                        timestamp: new Date(),
                    });
                } else {
                    // Generate generic message based on user data
                    that.getUser(id).then(function(doc) {
                        var targetName = doc.data().name;
                        var userName = firebase.auth().currentUser.displayName;
                        var targetType = doc.data().type;

                        console.log("Generating default message for target " + targetType.toLowerCase() + " " + targetName + " from " + userName + "...");

                        if (targetType == "Tutor") {
                            return "Hey " + targetName + ", I was just wondering if you could tutor me for " + that.currentRequest.subject + " at " + that.currentRequest.time + ".";
                        } else if (targetType == "Pupil") {
                            return "Hey " + targetName + ", I was just wondering if you would be open to be tutored for " + that.currentRequest.subject + " at " + that.currentRequest.time + ".";
                        } else {
                            return "Hey " + targetName + ", I was just wondering if we could meet at " + that.currentRequest.time + " to discuss " + that.currentRequest.subject + ".";
                        }
                    }).then(function(message) {
                        that.addRequest(id, {
                            subject: that.currentRequest.subject,
                            message: message,
                            time: that.currentRequest.time,
                            userName: firebase.auth().currentUser.displayName,
                            userID: firebase.auth().currentUser.uid,
                            userPhoto: firebase.auth().currentUser.photoURL,
                            userEmail: firebase.auth().currentUser.email,
                            timestamp: new Date(),
                        });
                    });
                }
            }
        });
    }

    var renderAllList = function() {
        that.replaceElement(
            dialog.querySelector('#all-request-actions-list'),
            that.renderTemplate('all-request-actions-list', that.currentRequest)
        );

        dialog.querySelectorAll('#page-all .mdc-list-item').forEach(function(el) {
            mdc.ripple.MDCRipple.attachTo(el);
            el.addEventListener('click', function() {
                var id = el.id.split('-').slice(1).join('-');
                displaySection(id);
            });
        });
    };

    var displaySection = function(id) {
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

        if (sel.querySelector('.mdc-text-field') != null) {
            mdc.textField.MDCTextField.attachTo(sel.querySelector('.mdc-text-field'));
        }

        sel.querySelectorAll('.mdc-list-item').forEach(function(el) {
            mdc.ripple.MDCRipple.attachTo(el);
            el.addEventListener('click', function() {
                var newVal = el.innerText.trim();
                console.log("Updating request " + type + " to be " + newVal + "...");
                that.currentRequest[type] = newVal;
                displaySection('page-all');
            });
        });
    });

    displaySection('page-all');
    dialog.querySelectorAll('.back').forEach(function(el) {
        el.addEventListener('click', function() {
            // Add message support
            that.currentRequest['message'] = that.dialogs.request_user.root_.querySelector('textarea').value;

            displaySection('page-all');
        });
    });
};

Tutorbook.prototype.initReviewDialog = function() {
    var dialog = document.querySelector('#dialog-add-review');
    this.dialogs.add_review = new mdc.dialog.MDCDialog(dialog);
    this.dialogs.add_review.autoStackButtons = false;

    var that = this;
    this.dialogs.add_review.listen('MDCDialog:closing', function(event) {
        if (event.detail.action == 'accept') {
            console.log("Adding rating...");
            var pathname = that.getCleanPath(document.location.pathname);
            var id = pathname.split('/')[2];

            that.addRating(id, {
                rating: rating,
                text: dialog.querySelector('#text').value,
                userName: firebase.auth().currentUser.displayName,
                userPhoto: firebase.auth().currentUser.photoURL,
                userEmail: firebase.auth().currentUser.email,
                timestamp: new Date(),
                userId: firebase.auth().currentUser.uid
            }).then(function() {
                that.rerender();
            });
        }
    });

    var rating = 0;

    mdc.textField.MDCTextField.attachTo(dialog.querySelector('.mdc-text-field'));
    dialog.querySelectorAll('.star-input i').forEach(function(el) {
        var rate = function() {
            var after = false;
            rating = 0;
            [].slice.call(el.parentNode.children).forEach(function(child) {
                if (!after) {
                    rating++;
                    child.innerText = 'star';
                } else {
                    child.innerText = 'star_border';
                }
                after = after || child.isSameNode(el);
            });
        };
        el.addEventListener('mouseover', rate);
    });
};

Tutorbook.prototype.viewRequestDialog = function() {
    // This should render the full screen request dialog based off of the 
    // currentRequest (which will be determined by clicking on a subject or
    // filling out the basic request dialog)
    var that = this;
    var headerData = {
        title: 'Request ' + this.currentRequest.toUserName.split(' ')[0],
        add_request: function() {
            console.log("Adding user request...");
            var pathname = that.getCleanPath(document.location.pathname);
            var id = pathname.split('/')[2];

            // Get the current message
            messageTextField = document.querySelector('main #message-text-field textarea');
            if (messageTextField.value != '') {
                that.currentRequest.message = messageTextField.value;
            }

            if (that.currentRequest.message) {
                that.addRequest(id, {
                    subject: that.currentRequest.subject,
                    message: that.currentRequest.message,
                    time: that.currentRequest.time,
                    userName: firebase.auth().currentUser.displayName,
                    userID: firebase.auth().currentUser.uid,
                    userPhoto: firebase.auth().currentUser.photoURL,
                    userEmail: firebase.auth().currentUser.email,
                    timestamp: new Date(),
                });
            } else {
                // Generate generic message based on user data
                that.getUser(id).then(function(doc) {
                    var targetName = doc.data().name;
                    var userName = firebase.auth().currentUser.displayName;
                    var targetType = doc.data().type;

                    console.log("Generating default message for target " + targetType.toLowerCase() + " " + targetName + " from " + userName + "...");

                    if (targetType == "Tutor") {
                        return "Hey " + targetName + ", I was just wondering if you could tutor me for " + that.currentRequest.subject + " at " + that.currentRequest.time + ".";
                    } else if (targetType == "Pupil") {
                        return "Hey " + targetName + ", I was just wondering if you would be open to be tutored for " + that.currentRequest.subject + " at " + that.currentRequest.time + ".";
                    } else {
                        return "Hey " + targetName + ", I was just wondering if we could meet at " + that.currentRequest.time + " to discuss " + that.currentRequest.subject + ".";
                    }
                }).then(function(message) {
                    that.addRequest(id, {
                        subject: that.currentRequest.subject,
                        message: message,
                        time: that.currentRequest.time,
                        userName: firebase.auth().currentUser.displayName,
                        userID: firebase.auth().currentUser.uid,
                        userPhoto: firebase.auth().currentUser.photoURL,
                        userEmail: firebase.auth().currentUser.email,
                        timestamp: new Date(),
                    });
                });
            }
            that.rerender();
        },
        cancel: function() {
            that.rerender();
        },
    };
    var headerEl = this.renderTemplate('request-user-toolbar', headerData);
    var mainEl = this.renderTemplate('request-user');

    console.log(this.currentRequest);
    this.getUser(this.currentRequest.toUserEmail).then(function(doc) {
            var data = doc.data();

            if (data.type == 'Tutor') {
                return doc.ref.collection('proficientStudies').get();
            } else {
                return doc.ref.collection('neededStudies').get();
            }
        })
        .then(function(studies) {
            // Make a list of studies for rendering request dialog
            var validStudies = [];
            if (studies.size) {
                studies.forEach(function(study) {
                    validStudies.push(study.data().name);
                });
            }

            // TODO: Only show a list of valid timeslots for requests
            var getTimes = function(minutesInterval, startTime) {
                var x = minutesInterval; //minutes interval
                var times = []; // time array
                var tt = startTime; // start time
                var ap = ['AM', 'PM']; // AM-PM

                //loop to increment the time and push results in array
                for (var i = 0; tt < 24 * 60; i++) {
                    var hh = Math.floor(tt / 60); // getting hours of day in 0-24 format
                    var mm = (tt % 60); // getting minutes of the hour in 0-55 format
                    times[i] = ("0" + (hh % 12)).slice(-2) + ':' + ("0" + mm).slice(-2) + ap[Math.floor(hh / 12)]; // pushing data in array in [00:00 - 12:00 AM/PM format]
                    tt = tt + x;
                }
                return times;
            }
            var validTimes = getTimes(30, 0);

            // TODO: Actually make that do something (maybe store it as part of the user document?
            var validLocations = ['Mitchell Park Library', 'Gunn High School AC', 'PALY Library'];

            var mainData = {
                validSubjects: validStudies,
                validTimes: validTimes,
                validLocations: validLocations,
            };
            return mainData;
        })
        .then(function(data) {
            var removeDataAttr = function(id, el) {
                var dataAttr = ['data-fir-foreach', 'data-fir-attr', 'data-fir-content'];
                dataAttr.forEach(function(attr) {
                    el.querySelectorAll('option').forEach(function(el) {
                        return el.removeAttribute(attr);
                    });
                    el.querySelectorAll('.mdc-list-item').forEach(function(el) {
                        return el.removeAttribute(attr);
                    });
                    el.querySelectorAll('label').forEach(function(el) {
                        return el.removeAttribute(attr);
                    });

                    // Add unique identifier for listening later on
                    el.querySelectorAll('.mdc-select').forEach(function(el) {
                        return el.setAttribute('id', id);
                    });
                });

                return el;
            };

            that.replaceElement(
                mainEl.querySelector('#subject-select'),
                removeDataAttr('subject-select', that.renderTemplate('option-list', {
                    items: data.validSubjects,
                    labelText: 'Subject',
                }))
            );

            that.replaceElement(
                mainEl.querySelector('#location-select'),
                removeDataAttr('location-select', that.renderTemplate('option-list', {
                    items: data.validLocations,
                    labelText: 'Location',
                }))
            );

            that.replaceElement(
                mainEl.querySelector('#from-time-select'),
                removeDataAttr('from-time-select', that.renderTemplate('option-list', {
                    items: data.validTimes,
                    labelText: 'From',
                }))
            );

            that.replaceElement(
                mainEl.querySelector('#to-time-select'),
                removeDataAttr('to-time-select', that.renderTemplate('option-list', {
                    items: data.validTimes,
                    labelText: 'To',
                }))
            );

            // Listen for changes in data and update profile accordingly

            // Display final views
            that.replaceElement(document.querySelector('.header'), headerEl);
            that.replaceElement(document.querySelector('main'), mainEl);

            // Location Select
            var el = mainEl.querySelector('#location-select .mdc-select');
            var locationSelect = mdc.select.MDCSelect.attachTo(el);
            if (!!that.currentRequest.location && that.currentRequest.location != '') {
                console.log("Updating location select", that.currentRequest.location);
                el.querySelector('.mdc-floating-label').setAttribute('class', 'mdc-floating-label mdc-floating-label--float-above');
                index = data.validLocations.indexOf(that.currentRequest.location);
                locationSelect.selectedIndex = index;
            }
            locationSelect.listen('MDCSelect:change', function() {
                console.log("Updating currentRequest for location", locationSelect.value);
                that.currentRequest.location = locationSelect.value;
            });

            // Subject Select
            var el = mainEl.querySelector('#subject-select .mdc-select');
            var subjectSelect = mdc.select.MDCSelect.attachTo(el);
            if (!!that.currentRequest.subject && that.currentRequest.subject != '') {
                console.log("Updating subject select", that.currentRequest.subject);
                el.querySelector('.mdc-floating-label').setAttribute('class', 'mdc-floating-label mdc-floating-label--float-above');
                index = data.validSubjects.indexOf(that.currentRequest.subject);
                subjectSelect.selectedIndex = index;
            }
            subjectSelect.listen('MDCSelect:change', function() {
                console.log("Updating currentRequest for subject", subjectSelect.value);
                that.currentRequest.subject = subjectSelect.value;
            });

            // To Time Select
            var el = mainEl.querySelector('#to-time-select .mdc-select');
            var toTimeSelect = mdc.select.MDCSelect.attachTo(el);
            if (!!that.currentRequest.toTime && that.currentRequest.toTime != '') {
                console.log("Updating toTime select", that.currentRequest.toTime);
                el.querySelector('.mdc-floating-label').setAttribute('class', 'mdc-floating-label mdc-floating-label--float-above');
                index = data.validTimes.indexOf(that.currentRequest.toTime);
                toTimeSelect.selectedIndex = index;
            }
            toTimeSelect.listen('MDCSelect:change', function() {
                console.log("Updating currentRequest for toTime", toTimeSelect.value);
                that.currentRequest.toTime = toTimeSelect.value;
            });

            // From Time Select
            var el = mainEl.querySelector('#from-time-select .mdc-select');
            var fromTimeSelect = mdc.select.MDCSelect.attachTo(el);
            if (!!that.currentRequest.fromTime && that.currentRequest.fromTime != '') {
                console.log("Updating fromTime select", that.currentRequest.fromTime);
                el.querySelector('.mdc-floating-label').setAttribute('class', 'mdc-floating-label mdc-floating-label--float-above');
                index = data.validTimes.indexOf(that.currentRequest.fromTime);
                fromTimeSelect.selectedIndex = index;
            }
            fromTimeSelect.listen('MDCSelect:change', function() {
                console.log("Updating currentRequest for fromTime", fromTimeSelect.value);
                that.currentRequest.fromTime = fromTimeSelect.value;
            });

            // Message Text-Field
            var el = mainEl.querySelector('#message-text-field');
            messageTextField = mdc.textField.MDCTextField.attachTo(el);
            if (!!that.currentRequest.message && that.currentRequest.message != '') {
                console.log("Updating message text-field", that.currentRequest.message);
                messageTextField.value = that.currentRequest.message;
            }

            // TODO: Get rid of this for a more systematic mdc init
            /*
             *mdc.autoInit();
             */
        })
        .catch(function(error) {
            console.error("Error while rendering request view", error);
        });
};