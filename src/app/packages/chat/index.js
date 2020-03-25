/**
 * @license
 * Copyright (C) 2020 Tutorbook
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS 
 * FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more 
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
    MDCRipple
} from '@material/ripple/index';

import * as $ from 'jquery';
import to from 'await-to-js';

import Utils from '@tutorbook/utils';

export class Chat {

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
                (message !== '') ? await this.sendMessage(message): null;
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
        window.$ = $;
        $(this.main).find('#messages').empty();
        window.app.listeners.push(this.getMessages().onSnapshot({
            error: (err) => {
                window.app.snackbar.view('Could not get messages.');
                console.error('[ERROR] Could not get messages b/c of ', err);
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
        const messages = $(this.main).find('#messages');
        const id = message.getAttribute('id');
        const timestamp = $(message).attr('timestamp');
        const existing = messages.find('[id="' + id + '"]');

        const scroll = () => messages.find('.message:last-child')[0]
            .scrollIntoView();
        const style = () => {
            const sender = $(message).attr('sender');
            const nextSender = $(message).next().attr('sender');
            const prevSender = $(message).prev().attr('sender');
            if (sender === prevSender) $(message).css('margin-top', '5px')
                .prev().find('img').css('visibility', 'hidden');
            if (sender === nextSender) $(message).find('img').css('visibility',
                'hidden').end().next().css('margin-top', '5px');
        };

        if (existing.length) return existing.replaceWith(message);
        for (var i = 0; i < messages[0].children.length; i++) {
            var child = messages[0].children[i];
            var time = $(child).attr('timestamp');
            if (time && time > timestamp) {
                $(message).insertBefore(child);
                style();
                return scroll();
            }
        }

        messages.append(message);
        style();
        scroll();
    }

    // Render function that returns a message div with the given message as text
    renderMessage(doc) {
        const el = this.render.template('message', Utils.combineMaps(doc.data(), {
            id: 'doc-' + doc.id,
            timestamp: doc.data().timestamp.toDate().getTime(),
            img: doc.data().sentBy.uid !== window.app.user.uid,
            sender: doc.data().sentBy.uid,
        }));
        if (doc.data().sentBy.uid === window.app.user.uid)
            $(el).removeClass('you').addClass('me');
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
            sms: window.app.conciseUser.name.split(' ')[0] + ' says: ' + txt,
        };
        const [err, res] = await to(ref.set(msg));
        if (err) return window.app.snackbar.view('Could not send message.');
        const chat = db.collection('chats').doc(this.id);
        return chat.update({
            lastMessage: msg,
        });
    }
};

export class AnnouncementChat extends Chat {
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