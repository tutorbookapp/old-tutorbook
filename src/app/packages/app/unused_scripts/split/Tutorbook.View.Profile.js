Tutorbook.prototype.initProfileView = function() {
    // This is broken from viewProfile() as it only has to happen once
    var profileViewEl = document.querySelector('#profile-view');

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

    var that = this;
    this.replaceElement(
        profileViewEl.querySelector('.mdc-list .mdc-list-item #type-select'),
        removeDataAttr('type-select', that.renderTemplate('option-list', {
            items: that.data.types,
            labelText: 'Type',
        }))
    );

    this.replaceElement(
        profileViewEl.querySelector('#gradeString-select'),
        removeDataAttr('gradeString-select', that.renderTemplate('option-list', {
            items: that.data.grades,
            labelText: 'Grade',
        }))
    );

    this.replaceElement(
        profileViewEl.querySelector('#gender-select'),
        removeDataAttr('gender-select', that.renderTemplate('option-list', {
            items: that.data.genders,
            labelText: 'Gender',
        }))
    );

    profileViewEl.querySelectorAll('#subject-select').forEach(function(el) {
        return that.replaceElement(
            el,
            removeDataAttr('subject-select', that.renderTemplate('option-list', {
                items: that.data.subjects,
                labelText: 'Subject',
            })),
        );
    });
};

Tutorbook.prototype.viewProfile = function() {
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
            // Update user profile
            var profileEl = document.querySelector('#profile-view');
            var email = mdc.textField.MDCTextField.attachTo(profileEl.querySelector('.mdc-list-item #email-text-field'));
            var phone = mdc.textField.MDCTextField.attachTo(profileEl.querySelector('.mdc-list-item #phone-text-field'));
            var bio = mdc.textField.MDCTextField.attachTo(profileEl.querySelector('.mdc-list-item #bio-text-field'));

            that.currentUser.email = email.value;
            that.currentUser.phone = phone.value;
            that.currentUser.profile = bio.value;

            that.updateUser(that.currentUser);

            // Go back to home screen
            that.router.navigate('/');
        }
    });
    // TODO: Make header elements universal (i.e. part of "this")

    // Listen for changes in data and update profile accordingly
    var addMaterialListeners = function(profileViewEl) {

        // User Type Select
        var el = profileViewEl.querySelector('#type-select .mdc-select');
        var typeSelect = mdc.select.MDCSelect.attachTo(el);
        if (!!that.currentUser.type && that.currentUser.type != '') {
            console.log("Updating type select", that.currentUser.type);
            index = that.data.types.indexOf(that.currentUser.type);
            typeSelect.selectedIndex = index;
        }
        typeSelect.listen('MDCSelect:change', function() {
            id = typeSelect.root_.getAttribute('id');
            console.log("Updating currentUser for", id);
            that.currentUser[id.split('-')[0]] = typeSelect.value;
            that.updateUser(that.currentUser)
                .catch(function(error) {
                    console.warn("Document for currentUser" + that.currentUser.email + " doesn't exist yet, creating one...");
                    that.addUser(that.currentUser)
                        .catch(function(error) {
                            console.error("Unable to create currentUser profileViewEl for " + currentUser + ":", error);
                        });
                });
        });

        // Gender Select
        var el = profileViewEl.querySelector('#gender-select .mdc-select');
        var genderSelect = mdc.select.MDCSelect.attachTo(el);
        if (!!that.currentUser.gender && that.currentUser.gender != '') {
            console.log("Updating gender select", that.currentUser.gender);
            index = that.data.genders.indexOf(that.currentUser.gender);
            genderSelect.selectedIndex = index;
        }
        genderSelect.listen('MDCSelect:change', function() {
            id = genderSelect.root_.getAttribute('id');
            console.log("Updating currentUser for", id);
            that.currentUser[id.split('-')[0]] = genderSelect.value;
            that.updateUser(that.currentUser)
                .catch(function(error) {
                    console.warn("Document for currentUser" + that.currentUser.email + " doesn't exist yet, creating one...");
                    that.addUser(that.currentUser)
                        .catch(function(error) {
                            console.error("Unable to create currentUser profileViewEl for " + currentUser + ":", error);
                        });
                });
        });

        // Grade Select
        var el = profileViewEl.querySelector('#gradeString-select .mdc-select');
        var gradeSelect = mdc.select.MDCSelect.attachTo(el);
        if (!!that.currentUser.gradeString && that.currentUser.gradeString != '') {
            console.log("Updating gradeString select", that.currentUser.gradeString);
            index = that.data.grades.indexOf(that.currentUser.gradeString);
            gradeSelect.selectedIndex = index;
        }
        gradeSelect.listen('MDCSelect:change', function() {
            id = gradeSelect.root_.getAttribute('id');
            console.log("Updating currentUser for", id);
            that.currentUser[id.split('-')[0]] = gradeSelect.value;
            that.updateUser(that.currentUser)
                .catch(function(error) {
                    console.warn("Document for currentUser" + that.currentUser.email + " doesn't exist yet, creating one...");
                    that.addUser(that.currentUser)
                        .catch(function(error) {
                            console.error("Unable to create currentUser profileViewEl for " + currentUser + ":", error);
                        });
                });
        });

        // Subject Select(s)
        var els = profileViewEl.querySelectorAll('#subject-select .mdc-select');
        var index = -1;
        els.forEach(function(el) {
            index += 1;
            var subjectSelect = mdc.select.MDCSelect.attachTo(el);
            if (that.currentUser.type == 'Tutor') {
                var studies = 'proficientStudies';
            } else {
                var studies = 'neededStudies';
            }
            if (!!that.currentUser[studies] && that.currentUser[studies] != []) {
                var selectedIndex = that.data.subjects.indexOf(that.currentUser[studies][index]);
                subjectSelect.selectedIndex = selectedIndex;
            }

            subjectSelect.listen('MDCSelect:change', function() {
                if (that.currentUser.type == 'Tutor') {
                    var studies = 'proficientStudies';
                } else {
                    var studies = 'neededStudies';
                }
                that.currentUser[studies].push(subjectSelect.value);
                that.updateUser(that.currentUser);
                that.addStudy({
                        'name': subjectSelect.value
                    }, studies)
                    .catch(function(error) {
                        console.error("Unable to add subject doc for " + currentUser + ":", error);
                    });
            });
        });

        // Bio Text-Field
        var el = profileViewEl.querySelector('#bio-text-field');
        bioTextField = mdc.textField.MDCTextField.attachTo(el);
        if (!!that.currentUser.profile && that.currentUser.profile != '') {
            console.log("Updating bio text-field", that.currentUser.profile);
            bioTextField.value = that.currentUser.profile;
        }

        // Email Text-Field
        var el = profileViewEl.querySelector('#email-text-field');
        emailTextField = mdc.textField.MDCTextField.attachTo(el);
        if (!!that.currentUser.email && that.currentUser.email != '') {
            console.log("Updating email text-field", that.currentUser.email);
            emailTextField.value = that.currentUser.email;
        }

        // Phone Text-Field
        var el = profileViewEl.querySelector('#phone-text-field');
        phoneTextField = mdc.textField.MDCTextField.attachTo(el);
        if (!!that.currentUser.phone && that.currentUser.phone != '') {
            console.log("Updating phone text-field", that.currentUser.phone);
            phoneTextField.value = that.currentUser.phone;
        }
    };

    /*
     *console.log("Rendering profile view for user", this.currentUser);
     */
    var profileViewEl = this.renderTemplate('profile-view', this.currentUser);

    this.replaceElement(document.querySelector('.header'), headerEl);
    this.replaceElement(document.querySelector('main'), profileViewEl);
    addMaterialListeners(profileViewEl);
};