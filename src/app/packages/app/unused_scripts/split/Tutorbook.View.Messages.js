Tutorbook.prototype.viewMessages = function(groupID) {
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
        }
    });
    var messagesEl = this.renderTemplate('messages');
    var messageListEl = messagesEl.querySelector('#message-list');

    var messageFormEl = messagesEl.querySelector('#message-form');
    var messageInputEl = messagesEl.querySelector('#message');
    var submitButtonEl = messagesEl.querySelector('#submit');

    messageFormEl.addEventListener('submit', onMessageFormSubmit);

    this.replaceElement(document.querySelector('main'), messagesEl);
    this.replaceElement(document.querySelector('.header'), headerEl);

    /*
     *mdc.autoInit();
     */

    var that = this;
    // Template for messages.
    var MESSAGE_TEMPLATE =
        '<div class="message-container">' +
        '<div class="spacing"><div class="pic"></div></div>' +
        '<div class="message"></div>' +
        '<div class="name"></div>' +
        '</div>';

    // Adds a size to Google Profile pics URLs.
    function addSizeToGoogleProfilePic(url) {
        if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
            return url + '?sz=150';
        }
        return url;
    }


    // Resets the given MaterialTextField.
    function resetMaterialTextfield(element) {
        element.value = '';
        element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
    }

    // Triggered when the send new message form is submitted.
    function onMessageFormSubmit(e) {
        e.preventDefault();
        // Check that the user entered a message and is signed in.
        if (messageInputEl.value && !!firebase.auth().currentUser) {
            that.addMessage(messageInputEl.value, groupID).then(function() {
                // Clear message text field and re-enable the SEND button.
                resetMaterialTextfield(messageInputEl);
                toggleButton();
            });
        }
    }


    // Enables or disables the submit button depending on the values of the input
    // fields.
    function toggleButton() {
        if (messageInputEl.value) {
            submitButtonEl.removeAttribute('disabled');
        } else {
            submitButtonEl.setAttribute('disabled', 'true');
        }
    }

    this.messagesRenderer = {
        display: function(doc) {
            var message = doc.data();
            var id = doc.id;

            // Displays a Message in the UI.
            var div = document.getElementById(id);
            // If an element for that message does not exists yet we create it.
            if (!div) {
                var container = document.createElement('div');
                container.innerHTML = MESSAGE_TEMPLATE;
                div = container.firstChild;
                div.setAttribute('id', id);
                div.setAttribute('timestamp', message.timestamp);
                for (var i = 0; i < messageListEl.children.length; i++) {
                    var child = messageListEl.children[i];
                    var time = child.getAttribute('timestamp');
                    // If there is a message that was sent later (more recently)
                    // Then this message will appear right before that message.
                    if (time && time > message.timestamp) {
                        break;
                    }
                }
                messageListEl.insertBefore(div, child);
            }
            if (message.userPhoto) {
                div.querySelector('.pic').style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(message.userPhoto) + ')';
            }
            div.querySelector('.name').textContent = message.userName;
            var messageElement = div.querySelector('.message');
            if (text) { // If the message is text.
                messageElement.textContent = message.messageText;
                // Replace all line breaks by <br>.
                messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
            } else if (message.imageUrl) { // If the message is an image.
                var image = document.createElement('img');
                image.addEventListener('load', function() {
                    messageListEl.scrollTop = messageListEl.scrollHeight;
                });
                image.src = message.imageUrl + '&' + new Date().getTime();
                messageElement.innerHTML = '';
                messageElement.appendChild(image);
            }
            // Show the card fading-in and scroll to view the new message.
            setTimeout(function() {
                div.classList.add('visible')
            }, 1);
            messageListEl.scrollTop = messageListEl.scrollHeight;
            messageInputEl.focus();
        },
        remove: function(doc) {
            // Delete a Message from the UI.
            var div = document.getElementById(doc.id);
            // If an element for that message exists we delete it.
            if (div) {
                div.parentNode.removeChild(div);
            }
        },
        empty: function() {
            var noResultsEl = that.renderTemplate('no-results');

            that.replaceElement(document.querySelector('main'), noResultsEl);
            return;
        }
    }

    this.getMessages(groupID);
}

Tutorbook.prototype.viewMessageGroups = function() {
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
        }
    });

    var mainEl = this.renderTemplate('message-group-list');

    this.replaceElement(document.querySelector('.header'), headerEl);
    this.replaceElement(document.querySelector('main'), mainEl);

    var that = this;
    this.messageGroupRenderer = {
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
            data['go_to_messages'] = function() {
                that.router.navigate('/messages/' + doc.id);
            };

            var el = that.renderTemplate('message-group-card', data);
            /*
             *mdc.autoInit(); // Enable MDCRipple animations on click
             */
            // Setting the id allows to locating the individual user card
            el.querySelector('.location-card').id = 'doc-' + doc.id;
            try {
                var existingLocationCard = mainEl.querySelector('#doc-' + doc.id);
            } catch (e) {
                // add
                console.warn('Caught ' + e + ' while querying for #doc-' + doc.id + ', adding card.');
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
        },
        empty: function() {
            var noResultsEl = that.renderTemplate('no-results');

            that.replaceElement(document.querySelector('main'), noResultsEl);
            return;
        }
    };

    this.getMessageGroups(firebase.auth().currentUser.email);
}