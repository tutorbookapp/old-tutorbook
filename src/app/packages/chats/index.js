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

import {
    ConfirmationDialog,
} from '@tutorbook/dialogs';
import {
    Chat,
    AnnouncementChat,
} from '@tutorbook/chat';
import {
    NewGroupDialog,
    EditGroupDialog,
} from '@tutorbook/filters';

import Utils from '@tutorbook/utils';
import Data from '@tutorbook/data';

/**
 * Class that provides a chat view and header and enables users to message one 
 * another all within the app.
 */
export class Chats {

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
                console.warn('[WARNING] Trying again to open chat b/c of', err);
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

    /**
     * View function that shows all the chats that the currentUser is a part of.
     */
    viewChats() {
        this.chatsViewed = true;
        $(this.main).find('#chats .mdc-list-item:not([id="new-chat"])').remove();
        window.app.listeners.push(this.getChats().onSnapshot({
            error: (err) => {
                window.app.snackbar.view('Could not get chats.');
                console.error('[ERROR] Could not get chats b/c of ', err);
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

/**
 * Class that represents our 
 * ["Messages"]{@link https://tutorbook.app/app/messages} app view for 
 * supervisors (much like [Remind]{@link https://remind.com} but synced with 
 * all of your tutoring data and with automatic messages).
 * @extends Chats
 */
export class SupervisorChats extends Chats {
    constructor() {
        super();
        this.announcements = {};
        this.announcementDialogs = {};
    }

    async chat(id) {
        if (this.chats[id]) return this.chats[id].view();
        if (this.announcements[id]) return this.announcements[id].view();
        const [err, chat] = await to(this.getChat(id));
        if (err) {
            const attempt = this.getAnnouncement(id);
            if (!attempt) return this.view();
            const [e, announcement] = await to(attempt);
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

    async getAnnouncement(id) {
        if (!window.app.location.id) return console.error('[ERROR] Couldn\'t ' +
            'get announcement group chat (' + id + ') without location id.');
        for (var location of window.app.data.locations) {
            var doc = await location.collection('announcements').doc(id).get();
            if (doc.exists) return doc;
        } // TODO: Remove the below fallback.
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
            index: Data.algoliaIndex('chats'),
            search: async (that) => {
                const qry = $(that.el).find('.search-box input').val();
                qry.length > 0 ? that.showClearButton() : that.showInfoButton();
                const [err, res] = await to(that.index.search({
                    query: qry,
                    facetFilters: ['chatterUIDs:' + window.app.user.uid],
                }));
                if (err) return console.error('[ERROR] Could not search ' +
                    'messages b/c of', err);
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

    /**
     * Recycles the announcements stored at the web app's locations.
     * @see {@link Utils#recycle}
     */
    viewAnnouncements() {
        const recycler = {
            display: (doc, _, index) => this.viewAnnouncement(
                this.renderAnnouncementItem(doc, index)),
            remove: (doc, _, index) => $(this.main).find('#announcements #' +
                doc.id).remove(),
            empty: (_, index) => $(this.main).find('#announcements').find('.' +
                'mdc-list-item:not([id="new-announcement"])[index="' + index +
                '"]').remove(),
        };
        $(this.main).find('#announcements').find('.mdc-list-item:not([id="new' +
            '-announcement"])').remove();
        Utils.recycle({
            announcements: this.getAnnouncements(),
        }, recycler);
    }

    /**
     * Gets the announcement queries from the web app's locally stored locations.
     * @return {external:Query[]} An array of Firestore 
     * [Query]{@link external:Query} objects.
     */
    getAnnouncements() {
        return window.app.data.locationIDs.map(id => window.app.db
            .collection('locations').doc(id).collection('announcements')
            .orderBy('lastMessage.timestamp', 'desc'));
    }

    /**
     * Renders (and manages) an announcement list item.
     * @see {@link SupervisorChats#viewAnnouncements}
     * @param {external:DocumentSnapshot} doc - The announcement group's 
     * Firestore document snapshot.
     * @param {int} index - The index of the query from which this announcement 
     * document came from. See {@link Utils#recycle} for more information.
     * @return {HTMLElement} The rendered (and managed) `mdc-list-item`.
     */
    renderAnnouncementItem(doc, index) {
        const chat = new AnnouncementChat(doc);
        const dialog = new EditGroupDialog({
            name: doc.data().name,
            filters: doc.data().filters,
            group: doc.data(),
            ref: doc.ref,
        });
        this.announcements[doc.id] = chat;
        this.announcementDialogs[doc.id] = dialog;
        const el = this.render.template('chat-list-item',
            Utils.combineMaps(doc.data(), {
                open_chat: () => {
                    if ($(event.target).closest('button').length) return;
                    $(el).addClass('mdc-list-item--selected');
                    chat.view();
                },
                showMenuBtn: true,
                id: doc.id,
                photo: doc.data().photo,
                name: doc.data().name,
                index: index,
            }));
        const confirmDeletionDialog = new ConfirmationDialog('Delete ' +
            'Announcement Group?', 'You are about to permanantly delete all ' +
            'of this announcement group\'s data (including any filters and ' +
            'all past messages). Please check with your fellow supervisors ' +
            'before deletion. Note that this will not delete messages ' +
            'already relayed to your own DMs. Are you sure you want to ' +
            'continue?', async () => {
                const [err, res] = await to(doc.ref.delete());
                if (err) return window.app.snackbar.view('Could not delete ' +
                    'announcement group.');
                window.app.snackbar.view('Deleted announcement group.');
            }, () => {});
        const menuEl = this.render.template('menu', {
            options: [{
                label: 'Edit',
                action: () => dialog.view(),
            }, {
                label: 'Delete',
                action: () => confirmDeletionDialog.view(),
            }, {
                label: 'Raw Data',
                action: () => Utils.viewRaw(doc),
            }],
            id: Utils.genID(),
        });
        const menu = Utils.attachMenu(menuEl);
        MDCRipple.attachTo(el);
        MDCRipple.attachTo($(el).find('#menu-btn')[0]).unbounded = true;
        $(el).find('#menu-btn')[0].addEventListener('click', () => {
            const pos = $(el).find('#menu-btn').offset();
            menu.setAbsolutePosition(pos.left, pos.top);
            menu.open = true;
        });
        $('body #menus').prepend(menuEl);
        return el;
    }
};