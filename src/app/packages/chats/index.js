import {
    MDCRipple
} from '@material/ripple/index';
import {
    MDCTopAppBar
} from '@material/top-app-bar/index';

import $ from 'jquery';
import to from 'await-to-js';

const Utils = require('@tutorbook/utils');

class SupervisorChats extends Chats {

    renderHit(hit) {
        return this.renderChatItem({
            data: () => Utils.filterChatData(hit),
            id: hit.objectID,
        });
    }

    renderSelf() {
        super.renderSelf();
        this.search = new SearchHeader({
            title: 'Messages',
            placeholder: 'Search messages',
            index: algolia.initIndex('chats'),
            search: async (that) => {
                const qry = $(that.el).find('.search-box input').val();
                qry.length > 0 ? that.showClearButton() : that.showInfoButton();
                const res = await that.index.search({
                    query: qry,
                    facetFilters: window.app.location.name === 'Any' ? [
                        'partition:' + (window.app.test ? 'test' : 'default'),
                    ] : [
                        'location.id:' + window.app.location.id,
                        'partition:' + (window.app.test ? 'test' : 'default'),
                    ],
                });
                $(that.el).find('#results').empty();
                res.hits.forEach((hit) => {
                    try {
                        $(that.el).find('#results').append(this.renderHit(hit));
                    } catch (e) {
                        console.warn('[ERROR] Could not render hit (' +
                            hit.objectID + ') b/c of', e);
                    }
                });
            },
        });
        this.header = this.search.el;
    }

    view() {
        super.view();
        this.search.manage();
    }

    reView() {
        super.reView();
        this.search.manage();
    }
};

// Class that provides a chat view and header and enables users to message one 
// another all within the app.
class Chats {

    constructor(app) {
        this.app = app;
        this.chats = {}; // Store chat objects in cache for responsiveness
        this.chatsByUID = {};
        this.render = window.app.render;
        this.recycler = {
            remove: (doc) => {
                if (window.app.nav.selected === 'Messages') {
                    return $(".main #chats [id='doc-" + doc.id + "']").remove();
                }
            },
            display: (doc) => {
                // We don't want to display user's that do not have a valid 
                // profile
                if (window.app.nav.selected === 'Messages') {
                    var listItem = this.renderChatItem(doc);
                    return this.viewChat(listItem);
                }
            },
            empty: () => {
                if (window.app.nav.selected === 'Messages') {
                    return $('.main #chats').empty().append(this.renderEmpty());
                }
            },
        };
        this.renderSelf();
    }

    viewChat(listItem) {
        const list = $(this.main).find('.mdc-list');
        const existing = $(list).find('#' + $(listItem).attr('id'));
        if (existing.length) {
            return $(existing).replaceWith(listItem);
        }
        list.append(listItem);
    }

    // View function that shows the user a mdc-list of their current chats
    view() {
        MDCTopAppBar.attachTo(this.header);
        window.app.intercom.view(true);
        window.app.nav.selected = 'Messages';
        window.app.view(this.header, this.main, '/app/messages');
        this.viewChats();
    }

    reView() {
        MDCTopAppBar.attachTo(this.header);
        this.reViewChats();
    }

    reViewChats() {
        const chats = this.chats;
        const that = this;
        $('main .mdc-list-item').each(async function() {
            const id = $(this).attr('id').trim();
            if (!!chats[id]) { // Use cached chat object
                return $(this).click(() => {
                    chats[id].view();
                });
            }
            const doc = await that.getChat(id); // Create and cache chat
            const chat = new Chat(doc.id, doc.data());
            chats[id] = chat;
            $(this).click(() => {
                chat.view();
            });
        });
    }

    async chat(id) {
        if (!this.chats[id])
            this.chats[id] = new Chat(id, (await this.getChat(id)).data());
        this.chats[id].view();
    }

    // Render function that returns the chat view
    renderSelf() {
        this.main = this.render.template('chats', {
            welcomeTitle: 'Messages',
            welcomeSubtitle: (window.app.user.type === 'Tutor') ? 'Answer ' +
                'your students\'s questions, market yourself to prospective ' +
                'students, and manage appointments with students all in one ' +
                'place.' : 'Ask your tutor questions, re-schedule ' +
                'appointments, and talk to prospective tutors all in one ' +
                'place.',
            showWelcome: !window.app.onMobile,
        });
        this.header = this.render.header('header-main', {
            title: 'Messages',
        });
    }

    // View function that shows all the chats that the currentUser is a part of
    viewChats() {
        var that = this;
        this.emptyChats();
        this.getChats().onSnapshot((snapshot) => {
            if (!snapshot.size) {
                return that.recycler.empty();
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'removed') {
                    that.recycler.remove(change.doc);
                } else {
                    that.recycler.display(change.doc);
                }
            });
        });
    }

    renderEmpty() {
        return this.render.template('centered-text', {
            text: 'No chats.',
        });
    }

    // Function that returns the user's current chats (we will support filtering
    // chats in the future).
    getChats() {
        return window.app.db.collection('chats')
            .where('chatterUIDs', 'array-contains', window.app.user.uid);
    }

    // Helper function that empties the current chat list to display new ones
    emptyChats() {
        return $('main #chats').empty();
    }

    // Data action function that deletes the chat and TODO: sends out deleted 
    // chat notifications to the other users on the chat.
    deleteChat(chat, id) {
        const db = window.app.db;
        return db.collection('chats').doc(id).delete();
    }

    getChat(id) {
        return window.app.db.collection('chats').doc(id).get();
    }

    // Render function that returns a chat list item
    renderChatItem(doc) {

        function getOther(UIDs) {
            if (UIDs[0] !== window.app.user.uid) {
                return UIDs[0];
            }
            return UIDs[1];
        };

        const that = this;
        const chat = new Chat(doc.id, doc.data());
        this.chats[doc.id] = chat;
        this.chatsByUID[getOther(doc.data().chatterUIDs)] = chat;
        const el = this.render.template('chat-list-item',
            Utils.combineMaps(doc.data(), {
                open_chat: () => {
                    chat.view();
                },
                id: doc.id,
                photo: Utils.getOtherUser(
                    doc.data().chatters[0],
                    doc.data().chatters[1]
                ).photo,
                name: Utils.getOtherUser(
                    doc.data().chatters[0],
                    doc.data().chatters[1]
                ).name,
                showAction: false, // TODO: Add delete action for chats.
                actionLabel: 'Delete',
                action: () => {
                    return new ConfirmationDialog('Delete Chat?', 'Are you ' +
                            'sure you want to permanently delete this chat?' +
                            ' Once you do, no one will be able to view their' +
                            ' past messages. This action cannot be undone.')
                        .view()
                        .listen('MDCDialog:closing', async (event) => {
                            if (event.detail.action === 'yes') {
                                $('main .chats #doc-' + doc.id).remove();
                                [err, res] = await to(
                                    that.deleteChat(doc.data(), doc.id)
                                );
                                if (err) {
                                    console.error('Error while deleting chat:',
                                        err);
                                    return window.app.snackbar.view(
                                        'Could not delete chat.'
                                    );
                                }
                                window.app.snackbar.view('Deleted chat.');
                            }
                        });
                },
            }));
        MDCRipple.attachTo(el);
        return el;
    }

    // Creates a new chat with the given user
    async newWith(user) {
        // First, check if we have a stored chat object for the given user
        if (this.chatsByUID[user.uid]) return this.chatsByUID[user.uid];

        // Second, check if the user already has a chat with the given user
        const db = window.app.db;
        const chats = await db.collection('chats')
            .where('chatterUIDs', 'array-contains', window.app.user.uid)
            .get();
        const docs = [];
        chats.forEach((chat) => {
            docs.push(chat);
        });
        for (var i = 0; i < docs.length; i++) {
            if (docs[i].data().chatterUIDs.indexOf(user.uid) >= 0) {
                return new Chat(docs[i].id, docs[i].data());
            }
        }

        // If not, create a new chat group.
        const conciseUser = Utils.filterRequestUserData(user);
        const chat = {
            lastMessage: {
                message: 'No messages so far. Click to send the first one.',
                sentBy: window.app.conciseUser,
                timestamp: new Date(),
            },
            chatters: [
                window.app.conciseUser,
                conciseUser,
            ],
            chatterUIDs: [
                window.app.user.uid,
                user.uid,
            ],
            chatterEmails: [
                window.app.user.email,
                user.email,
            ],
            createdBy: window.app.conciseUser,
            name: '', // We just use the chatter name as the chat name
            photo: '', // We just use the chatter photo as the chat photo
        };
        const ref = db.collection('chats').doc();
        await ref.set(chat);
        return new Chat(ref.id, chat);
    }
};


class Chat {

    constructor(id, chat) {
        this.id = id;
        this.chat = chat;
        this.render = window.app.render;
        this.recycler = {
            remove: (doc) => {
                if (window.app.nav.selected === 'Messages') {
                    return $(".main .chat #messages [id='doc-" + doc.id + "']").remove();
                }
            },
            display: (doc) => {
                // We don't want to display user's that do not have a valid profile
                if (window.app.nav.selected === 'Messages') {
                    $('.main .chat .centered-text').remove();
                    var message = this.renderMessage(doc);
                    this.viewMessage(message);
                }
            },
            empty: () => {
                if (window.app.nav.selected === 'Messages') {
                    $('.main .chat #messages').empty();
                    return $('.main .chat').prepend(this.renderEmptyMessages());
                }
            },
        };
        this.renderSelf();
    }

    // View function that opens up a chat view
    view() {
        window.app.intercom.view(false);
        window.app.nav.selected = 'Messages';
        window.app.view(this.header, this.main, '/app/messages/' + this.id);
        this.viewMessages();
        this.manage();
    }

    toString() {
        return 'Chat between ' + this.chat.chatters[0].name + ' and ' +
            this.chat.chatters[1].name;
    }

    renderSelf() {
        const name = Utils.getOtherUser(this.chat.chatters[0], this.chat
            .chatters[1]).name;
        const that = this;
        this.header = this.render.header('header-back', {
            title: 'Chat with ' + name,
        });
        this.main = this.render.template('chat', {
            send: async () => {
                const input = 'main .chat .write input';
                $(input).attr('disabled', 'disabled');
                const message = $(input).val();
                $(input).val('');
                $(input).removeAttr('disabled');
                (message !== '') ? await that.sendMessage(message): null;
            },
            placeholder: 'Message ' + name + '...',
        });
    }

    // Manager function that sends messages
    manage() {
        MDCRipple.attachTo($(this.main).find('button')[0]).unbounded = true;
        MDCTopAppBar.attachTo(this.header);
        const that = this;
        $(this.main).find('.write input').keyup(async function(e) {
            if (e.keyCode == 13) { // Enter key hit
                $(this).attr('disabled', 'disabled');
                const message = $(this).val();
                $(this).val('');
                $(this).removeAttr('disabled');
                (message !== '') ? await that.sendMessage(message): null;
            }
        });
    }

    // View function that shows the messages of the chat
    viewMessages() {
        this.emptyMessages();
        this.getMessages().onSnapshot((snapshot) => {
            if (!snapshot.size) {
                return this.recycler.empty();
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'removed') {
                    this.recycler.remove(change.doc);
                } else {
                    this.recycler.display(change.doc);
                }
            });
        });
    }

    // Helper function that empties the current chat list to display new ones
    emptyMessages() {
        return $('main #messages').empty();
    }

    // Adds message to chat view in correct order
    viewMessage(message) {
        var messages = $('.main .chat #messages')[0];
        var id = message.getAttribute('id');
        var timestamp = message.getAttribute('timestamp');

        var existingMessage = messages.querySelector('[id="' + id + '"]');
        if (!!existingMessage) {
            // modify
            messages.insertBefore(message, existingMessage);
            messages.removeChild(existingMessage);
        } else {
            // Add by timestamp
            for (var i = 0; i < messages.children.length; i++) {
                var child = messages.children[i];
                var time = child.getAttribute('timestamp');
                // If there is a request that was sent later (more recently)
                // Then this request will appear after that request
                if (time && time > timestamp) {
                    $(message).insertBefore(child);
                    return $(this.main).find('#messages .bubble:last-child')[0]
                        .scrollIntoView();
                }
            }
            // Append it normally
            $(messages).append(message);
            $(this.main).find('#messages .bubble:last-child')[0]
                .scrollIntoView();
        }
    }

    // Render function that returns a message div with the given message as text
    renderMessage(doc) {
        const el = this.render.template('message', Utils.combineMaps(doc.data(), {
            id: 'doc-' + doc.id,
            timestamp: doc.data().timestamp.toDate().getTime(),
        }));
        if (doc.data().sentBy.email === window.app.user.email) {
            el.setAttribute('class', 'bubble me');
        }
        return el;
    }

    // Data action function that gets the messages for the currentChat.
    getMessages() {
        const db = window.app.db;
        return db.collection('chats').doc(this.id).collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(30); // TODO: Add infinite scrolling for past messages
    }

    renderEmptyMessages() {
        return this.render.template('centered-text', {
            text: 'No messages so far.',
        });
    }

    // Data flow function that sends a message based on the currentChat's id
    async sendMessage(txt) {
        if (txt === '') {
            return;
        }
        const db = window.app.db;
        const message = db.collection('chats').doc(this.id)
            .collection('messages').doc();
        await message.set({
            sentBy: window.app.conciseUser,
            timestamp: new Date(),
            message: txt,
        });
        const chat = db.collection('chats').doc(this.id);
        return chat.update({
            lastMessage: {
                sentBy: window.app.conciseUser,
                timestamp: new Date(),
                message: txt,
            },
        });
    }
};

module.exports = {
    default: Chats,
    supervisor: SupervisorChats,
    chat: Chat,
};