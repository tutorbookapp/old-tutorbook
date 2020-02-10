import {
    MDCRipple
} from '@material/ripple/index';

import $ from 'jquery';
import to from 'await-to-js';

const algolia = require('algoliasearch')
    ('9FGZL7GIJM', '9ebc0ac72bdf6b722d6b7985d3e83550');
const Utils = require('@tutorbook/utils');
const NewGroupDialog = require('@tutorbook/filters').group;

// Class that provides a chat view and header and enables users to message one 
// another all within the app.
class Chats {

    constructor() {
        this.chats = {}; // Store chat objects in cache for responsiveness
        this.chatsByUID = {};
        this.render = window.app.render;
        this.recycler = {
            remove: doc => $(this.main).find('#chats [id="doc-' + doc.id +
                '"]').remove(),
            display: doc => this.viewChat(this.renderChatItem(doc)),
            empty: () => $(this.main).find('#chats .mdc-list-item:not([id="' +
                'new-chat"])').empty().append(this.renderEmpty()),
        };
        this.renderSelf();
    }

    viewChat(listItem) {
        const list = $(this.main).find('#chats');
        const existing = $(list).find('#' + $(listItem).attr('id'));
        if (existing.length) {
            if (existing.hasClass('mdc-list-item--selected')) $(listItem)
                .addClass('mdc-list-item--selected');
            return existing.replaceWith(listItem);
        }
        list.append(listItem);
    }

    // View function that shows the user a mdc-list of their current chats
    view(chat) {
        window.app.intercom.view(true);
        window.app.nav.selected = 'Messages';
        const chats = $(this.main).find('.chats-container');
        const scroll = chats.scrollTop();
        if (!this.managed) this.manage();
        if (!this.chatsViewed) this.viewChats();
        if (chat) this.chats[chat.id] = chat;
        window.visible = Utils.visible;
        var viewingChat, attemptsToViewChat = 0;
        const viewChat = () => {
            if (attemptsToViewChat > 10 && viewingChat) {
                window.clearInterval(viewingChat);
                window.app.snackbar.view('Could not open chat.');
            }
            attemptsToViewChat++;
            try {
                const scrolledInView = $(this.main)
                    .find('.messages-container').empty().append(chat.main).end()
                    .find('.mdc-list .mdc-list-item--selected')
                    .removeClass('mdc-list-item--selected').end()
                    .find('.mdc-list #' + chat.id)
                    .addClass('mdc-list-item--selected')[0].offsetTop - 10;
                window.app.view(this.header, this.main, '/app/messages/' +
                    chat.id);
                $(this.main).find('.chats-container').scrollTop(Utils.visible({
                    el: $(this.main).find('#' + chat.id)[0],
                    pageTop: scroll,
                }) ? scroll : scrolledInView);
                chat.viewMessages();
                chat.manage();
                if (viewingChat) window.clearInterval(viewingChat);
            } catch (err) {
                console.warn('Trying again to open chat b/c of', err);
            }
        };
        if (chat && $(this.main).find('#chats #' + chat.id).length) {
            viewChat();
        } else if (chat) {
            viewingChat = window.setInterval(viewChat, 150);
        } else if ($(this.main).find('.mdc-list-item--selected').length) {
            this.chats[$(this.main).find('.mdc-list-item--selected')
                .attr('id')].view();
        } else if ($(this.main).find('.messages-container .chat').length) {
            this.chats[$(this.main).find('.messages-container .chat')
                .attr('id')].view();
        } else {
            window.app.view(this.header, this.main, '/app/messages');
        }
    }

    reView() {
        window.app.intercom.view(true);
        window.app.nav.selected = 'Messages';
        if (!this.managed) this.manage();
        if (!this.chatsViewed) this.viewChats();
    }

    manage() {
        this.managed = true;
        Utils.attachHeader(this.header);
        MDCRipple.attachTo($(this.main).find('#chats #new-chat')[0]);
    }

    async chat(id) {
        if (!this.chats[id]) {
            const [err, chat] = await to(this.getChat(id));
            if (err) {
                window.app.snackbar.view('Could not open chat.');
                return this.view();
            }
            this.chats[id] = new Chat(id, chat.data());
        }
        this.chats[id].view();
    }

    // Render function that returns the chat view
    renderSelf() {
        this.main = window.app.onMobile ? this.render.template('chats-mobile', {
            newChat: () => new NewChatDialog().view(),
        }) : this.render.template('chats-desktop', {
            newChat: () => new NewChatDialog().view(),
        });
        this.header = this.render.header('header-main', {
            title: 'Messages',
        });
    }

    // View function that shows all the chats that the currentUser is a part of
    viewChats() {
        this.chatsViewed = true;
        $(this.main).find('#chats .mdc-list-item:not([id="new-chat"])').remove();
        window.app.listeners.push(this.getChats().onSnapshot({
            error: (err) => {
                window.app.snackbar.view('Could not get chats.');
                console.error('Could not get chats b/c of ', err);
            },
            next: (snapshot) => {
                if (!snapshot.size) return this.recycler.empty();

                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'removed') {
                        this.recycler.remove(change.doc);
                    } else {
                        this.recycler.display(change.doc);
                    }
                });
            },
        }));
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
            .where('chatterUIDs', 'array-contains', window.app.user.uid)
            .orderBy('lastMessage.timestamp', 'desc');
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

        const chat = new Chat(doc.id, doc.data());
        this.chats[doc.id] = chat;
        this.chatsByUID[getOther(doc.data().chatterUIDs)] = chat;
        const el = this.render.template('chat-list-item',
            Utils.combineMaps(doc.data(), {
                open_chat: () => {
                    $(el).addClass('mdc-list-item--selected');
                    chat.view();
                },
                id: doc.id,
                photo: doc.data().photo || Utils.getOtherUser(
                    doc.data().chatters[0],
                    doc.data().chatters[1]
                ).photo,
                name: doc.data().name || Utils.getOtherUser(
                    doc.data().chatters[0],
                    doc.data().chatters[1]
                ).name,
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
            location: window.app.location,
            createdBy: window.app.conciseUser,
            name: '', // We just use the chatter name as the chat name
            photo: '', // We just use the chatter photo as the chat photo
        };
        const ref = db.collection('chats').doc();
        await ref.set(chat);
        return new Chat(ref.id, chat);
    }
};

class SupervisorChats extends Chats {
    constructor() {
        super();
        this.announcements = {};
    }

    async chat(id) {
        if (this.chats[id]) return this.chats[id].view();
        if (this.announcements[id]) return this.announcements[id].view();
        const [err, chat] = await to(this.getChat(id));
        if (err) {
            const [e, announcement] = await to(this.getAnnouncement(id));
            if (e) {
                window.app.snackbar.view('Could not open chat.');
                return this.view();
            }
            this.announcements[id] = new AnnouncementChat(announcement);
            return this.announcements[id].view();
        }
        this.chats[id] = new Chat(id, chat.data());
        this.chats[id].view();
    }

    getAnnouncement(id) {
        return window.app.db.collection('locations').doc(window.app.location.id)
            .collection('announcements').doc(id).get();
    }

    renderHit(hit) {
        return this.renderChatItem({
            data: () => Utils.filterChatData(hit),
            id: hit.objectID,
        });
    }

    renderSelf() {
        super.renderSelf();
        $(this.main).find('#chats').replaceWith(
            this.render.template('supervisor-chats-list', {
                newAnnouncement: () => new NewGroupDialog({
                    groupNum: Object.values(this.announcements).length + 1,
                }).view(),
            }));
        this.search = new window.app.SearchHeader({
            title: 'Messages',
            placeholder: 'Search your messages',
            index: algolia.initIndex('chats'),
            search: async (that) => {
                const qry = $(that.el).find('.search-box input').val();
                qry.length > 0 ? that.showClearButton() : that.showInfoButton();
                const [err, res] = await to(that.index.search({
                    query: qry,
                    facetFilters: window.app.location.name === 'Any' ? [
                        'partition:' + (window.app.test ? 'test' : 'default'),
                        'chatterUIDs:' + window.app.user.uid,
                    ] : [
                        'location.id:' + window.app.location.id,
                        'partition:' + (window.app.test ? 'test' : 'default'),
                        'chatterUIDs:' + window.app.user.uid,
                    ],
                }));
                if (err) return console.error('Could not search messages b/c ' +
                    'of', err);
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

    view(chat) {
        super.view(chat);
        this.search.manage();
    }

    reView() {
        super.reView();
        this.search.manage();
    }

    viewChats() {
        super.viewChats();
        this.viewAnnouncements();
    }

    manage() {
        super.manage();
        MDCRipple.attachTo($(this.main).find('#new-announcement')[0]);
    }

    viewAnnouncement(listItem) {
        const list = $(this.main).find('#announcements');
        const existing = $(list).find('#' + $(listItem).attr('id'));
        if (existing.length) { // TODO: Why am I doing this?
            if (existing.hasClass('mdc-list-item--selected')) $(listItem)
                .addClass('mdc-list-item--selected');
            return existing.replaceWith(listItem);
        }
        list.append(listItem);
    }

    viewAnnouncements() {
        const recycler = {
            display: (doc) => this.viewAnnouncement(
                this.renderAnnouncementItem(doc)),
            remove: (doc) => $(this.main).find('#announcements #' + doc.id)
                .remove(),
            empty: () => $(this.main).find('#announcements').find('.mdc-list-' +
                'item:not([id="new-announcement"])').remove(),
        };
        $(this.main).find('#announcements').find('.mdc-list-item:not([id="new' +
            '-announcement"])').remove();
        window.app.listeners = window.app.listeners.concat(
            this.getAnnouncements().map(qry => qry.onSnapshot({
                error: (err) => {
                    window.app.snackbar.view('Could not get announcements.');
                    console.error('Could not get announcements b/c of ', err);
                },
                next: (snapshot) => {
                    if (!snapshot.size) {
                        return recycler.empty();
                    }

                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'removed') {
                            recycler.remove(change.doc);
                        } else {
                            recycler.display(change.doc);
                        }
                    });
                },
            })));
    }

    getAnnouncements() {
        return window.app.data.locationIDs.map(id => window.app.db
            .collection('locations').doc(id).collection('announcements')
            .orderBy('lastMessage.timestamp', 'desc'));
    }

    renderAnnouncementItem(doc) {
        const chat = new AnnouncementChat(doc);
        this.announcements[doc.id] = chat;
        const el = this.render.template('chat-list-item',
            Utils.combineMaps(doc.data(), {
                open_chat: () => {
                    $(el).addClass('mdc-list-item--selected');
                    chat.view();
                },
                id: doc.id,
                photo: doc.data().photo,
                name: doc.data().name,
            }));
        MDCRipple.attachTo(el);
        return el;
    }
};

class Chat {

    constructor(id, chat) {
        this.id = id;
        this.chat = chat;
        this.render = window.app.render;
        this.recycler = {
            remove: (doc) => {
                return $(this.main).find('#messages [id="doc-' + doc.id + '"]')
                    .remove();
            },
            display: (doc) => {
                $(this.main).find('.centered-text').remove();
                this.viewMessage(this.renderMessage(doc));
            },
            empty: () => {
                $(this.main).find('#messages').empty();
                if (!$(this.main).find('.centered-text').length)
                    $('.main .chat').prepend(this.renderEmptyMessages());
            },
        };
        this.renderSelf();
    }

    // View function that opens up a chat view
    view() {
        if ($(window.app.chats.main).find('.messages-container').length)
            return window.app.chats.view(this);
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
        const name = this.chat.name || Utils.getOtherUser(this.chat.chatters[0],
            this.chat.chatters[1]).name;
        const that = this;
        this.header = this.render.header('header-back', {
            title: 'Chat with ' + name,
        });
        this.main = this.render.template('chat', {
            send: async () => {
                const input = $(this.main).find('.write input');
                const btn = $(this.main).find('.write button');
                input.attr('disabled', 'disabled');
                btn.attr('disabled', 'disabled');
                const message = input.val();
                input.val('');
                input.removeAttr('disabled');
                (message !== '') ? await that.sendMessage(message): null;
            },
            placeholder: 'Message ' + name + '...',
            id: this.id,
        });
    }

    // Manager function that sends messages
    manage() {
        MDCRipple.attachTo($(this.main).find('button')[0]).unbounded = true;
        Utils.attachHeader(this.header);
        const that = this;
        $(this.main).find('.write input').keyup(async function(e) {
            const btn = $(that.main).find('.write button');
            $(this).val() === '' ? btn.attr('disabled', 'disabled') : btn
                .removeAttr('disabled');
            if (e.keyCode == 13) { // Enter key hit
                $(this).attr('disabled', 'disabled');
                btn.attr('disabled', 'disabled');
                const message = $(this).val();
                $(this).val('');
                $(this).removeAttr('disabled');
                (message !== '') ? await that.sendMessage(message): null;
            }
        });
    }

    // View function that shows the messages of the chat
    viewMessages() {
        $(this.main).find('#messages').empty();
        window.app.listeners.push(this.getMessages().onSnapshot({
            error: (err) => {
                window.app.snackbar.view('Could not get messages.');
                console.error('Could not get messages b/c of ', err);
            },
            next: (snapshot) => {
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
            },
        }));
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
            .limit(50); // TODO: Add infinite scrolling for past messages
    }

    renderEmptyMessages() {
        return this.render.template('centered-text', {
            text: 'No messages so far.',
        });
    }

    // Data flow function that sends a message based on the currentChat's id
    async sendMessage(txt) {
        if (txt === '') return;
        const db = window.app.db;
        const ref = db.collection('chats').doc(this.id)
            .collection('messages').doc();
        const msg = {
            sentBy: window.app.conciseUser,
            timestamp: new Date(),
            message: txt,
        };
        const [err, res] = await to(ref.set(msg));
        if (err) return window.app.snackbar.view('Could not send message.');
        const chat = db.collection('chats').doc(this.id);
        return chat.update({
            lastMessage: msg,
        });
    }
};

class AnnouncementChat extends Chat {
    constructor(doc) {
        super(doc.id, doc.data());
        this.doc = doc;
        this.ref = doc.ref;
    }

    getMessages() {
        return this.ref.collection('messages').orderBy('timestamp', 'desc')
            .limit(50);
    }

    async sendMessage(txt) {
        if (txt === '') return;
        const ref = this.ref.collection('messages').doc();
        const msg = {
            sentBy: window.app.conciseUser,
            timestamp: new Date(),
            message: txt,
        };
        const [e, res] = await to(ref.set(msg));
        if (e) return window.app.snackbar.view('Could not send announcement.');
        return this.ref.update({
            lastMessage: msg,
        });
    }
};

module.exports = {
    default: Chats,
    supervisor: SupervisorChats,
    chat: Chat,
};