// Dependencies
const to = require('await-to-js').default;
const db = require('firebase-admin')
  .firestore()
  .collection('partitions')
  .doc('default');
const functions = require('firebase-functions');
const express = require('express');
const twilio = new require('twilio')(
  functions.config().twilio.id,
  functions.config().twilio.key
);
const cors = require('cors')({
  origin: true,
});
const session = require('express-session')({
  secret: functions.config().twilio.webhook,
});
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const Message = require('message');
const Utils = require('utils');

// Helper function(s)
const getPronoun = (gender) => {
  switch (gender) {
    case 'Male':
      return 'He';
    case 'Female':
      return 'She';
    default:
      return 'They';
  }
};

// Configuration constants
const SKIP_SMS = functions.config().tests.SKIP_SMS;
const ERR_MSG =
  "Sorry, Tutorbook encountered an error and couldn't forward " +
  'your message. Contact +16508612723 to get this resolved.';
const WHO_TO_RELAY = new RegExp(
  '^Do you want to forward your message to [\\w' +
    '\\s]* \\(A\\) or [\\w\\s]* \\(B\\)\\?$'
);
const MSG_FORWARDED = new RegExp(
  '^Your message has been forwarded to [\\w\\s' +
    "]*\\. (He|She|They)'ll get back to you as soon as possible\\.$"
);
const MSG_RELAY = new RegExp('^[\\w\\s]* says: .*$');
const OPERATOR_RELAY = new RegExp('^Operator says: .*$');

class SMS {
  constructor(options = {}) {
    this.recipient = options.recipient;
    this.sender = options.sender;
    this.message = options.body;
    const bool = (val, def) => (typeof val === 'boolean' ? val : def);
    this.isTest = bool(options.isTest, false);
    this.botOnSuccess = bool(options.botOnSuccess, false);
    this.botOnFailure = bool(options.botOnFailure, true);
    this.botMessage =
      options.botMessage || 'Sent ' + this + ':\n' + this.message;
    this.botChats = options.botChats;
  }

  get valid() {
    const err = (msg) => console.error('[ERROR] ' + msg);
    if (this.recipient.location === 'Paly Peer Tutoring Center')
      return err('Cannot send SMS to Paly users.');
    if (!this.recipient || !this.recipient.phone)
      return err('Cannot send' + ' SMS messages to undefined phone numbers.');
    if (!this.message) return err('Cannot send empty SMS messages.');
    if (this.isTest) return err('Cannot send test SMS messages.');
    if (SKIP_SMS)
      return console.warn(
        '[WARNING] Skipping SMS b/c the ' +
          'SKIP_SMS configuration variable is set.'
      );
    return true;
  }

  async send() {
    if (!this.sender) {
      const [err, sender] = await to(
        Utils.getSupervisorForLocation(this.recipient.location, this.isTest)
      );
      if (err) return console.error('[ERROR] SMS must have a sender.');
      this.sender = sender;
    }
    if (!this.valid)
      return this.botOnFailure
        ? new Message({
            message: this.botMessage.replace('Sent', 'Could not send'),
            chats: this.botChats,
            sms: this.message,
            to: [this.recipient, this.sender],
          }).send()
        : null;
    console.log('[DEBUG] Sending ' + this + '...');
    try {
      await twilio.messages.create({
        body: this.message,
        from: functions.config().twilio.phone,
        to: this.recipient.phone,
      });
      console.log('[DEBUG] Sent ' + this + '.');
      if (this.botOnSuccess)
        return new Message({
          message: this.botMessage,
          chats: this.botChats,
          sms: this.message,
          to: [this.recipient, this.sender],
        }).send();
    } catch (err) {
      console.error('[ERROR] Could not send ' + this + ' b/c of', err);
      if (this.botOnFailure)
        return new Message({
          message: this.botMessage.replace('Sent', 'Could not send'),
          chats: this.botChats,
          sms: this.message,
          to: [this.recipient, this.sender],
        }).send();
    }
  }

  toString() {
    return (
      'SMS message to ' +
      this.recipient.name +
      (this.recipient.phone ? ' (' + this.recipient.phone + ')' : '')
    );
  }

  static receive() {
    const app = express();
    app.use(cors);
    app.use(session);
    app.post('/', async (req, res) => {
      const data = req.body;
      console.log(
        '[DEBUG] Responding to request with phone (' +
          data.From +
          ') and body (' +
          data.Body +
          ')...'
      );
      // 1) Get the last message that the user is responding to.
      var errored = 0,
        limit = 10;
      const combineMsgs = (a, b) =>
        a
          .concat(b)
          .sort(
            (msgA, msgB) =>
              new Date(msgB.dateCreated) - new Date(msgA.dateCreated)
          );
      const getMsgs = async () => {
        const gettingOutbound = twilio.messages.list({
          to: data.From,
          from: functions.config().twilio.phone,
          limit: Math.ceil(limit / 2) + errored,
        });
        const gettingInbound = twilio.messages.list({
          to: functions.config().twilio.phone,
          from: data.From,
          limit: Math.floor(limit / 2) + errored + 1,
        });
        const outbound = (await gettingOutbound).slice(errored);
        const inbound = (await gettingInbound).slice(errored + 1);
        return [inbound, outbound];
      }; // Get the responder and the initial 10 messages concurrently.
      const gettingInitialMsgs = getMsgs();
      const gettingResponder = Utils.getUserFromPhone(data.From);
      const responder = await gettingResponder;
      const [inbound, outbound] = await gettingInitialMsgs;
      console.log(
        '[DEBUG] Got the responder (' +
          responder.name +
          ' <' +
          responder.uid +
          ">)'s data."
      );
      const getSender = async (inbound, outbound) => {
        var msgs = combineMsgs(inbound, outbound);
        // Check if message is from our fallback receiver, if it is, get
        // the next most recent message.
        if (!msgs.length) {
          limit++;
          [inbound, outbound] = (await getMsgs()).slice(limit - 1);
          msgs = combineMsgs(inbound, outbound);
          console.log(
            '[DEBUG] Got the #' +
              limit +
              ' most recent ' +
              'message (' +
              msgs.length +
              ' msgs):',
            msgs[0]
          );
          if (!msgs.length)
            return {
              uid: 'operator',
            };
        }
        if (msgs[0].to === data.From)
          console.log(
            '[DEBUG] Most ' +
              'recent message (' +
              msgs[0].body +
              ') was outbound.'
          );
        if (msgs[0].from === data.From)
          console.log(
            '[DEBUG] Most ' +
              'recent message (' +
              msgs[0].body +
              ') was inbound.'
          );
        if (msgs[0].body === ERR_MSG) {
          console.log('[DEBUG] Message was from a routing error.');
          errored++;
          return getSender(inbound.slice(1), outbound.slice(1));
        }
        if (WHO_TO_RELAY.test(msgs[0].body)) {
          console.log('[TODO] Add question response support.');
          errored++;
          return getSender(inbound.slice(1), outbound.slice(1));
        }
        if (MSG_FORWARDED.test(msgs[0].body)) {
          console.log('[DEBUG] Message was a forwarding response.');
          return getSender(inbound, outbound.slice(1));
        }
        if (OPERATOR_RELAY.test(msgs[0].body)) {
          // TODO: We're probably going to get rid of these.
          console.log('[DEBUG] Message was an Operator relay error.');
          return getSender(inbound, outbound.slice(1));
        }
        if (MSG_RELAY.test(msgs[0].body)) {
          console.log('[DEBUG] Message was a relayed msg.');
          return [msgs[0], await getMessageSender(msgs[0])];
        }
        console.warn(
          '[WARNING] Could not identify message. Probably ' +
            'an automatic notification from the Operator.'
        );
        return [msgs[0], await getMessageSender(msgs[0])];
      };
      const getMessageSender = async (msg) => {
        // 1) List all of the user's chats whose lastMessage.timestamp
        // was within five minutes of the given message and whose
        // lastMessage.sms matched the given message's body.
        if (msg.from === responder.phone)
          msg.body = responder.name.split(' ')[0] + ' says: ' + msg.body;
        const after = new Date(msg.dateCreated);
        const before = new Date(msg.dateCreated);
        console.log(
          '[DEBUG] Getting chats w/ msgs (' +
            msg.body +
            ')' +
            ' sent w/in 5 mins of ' +
            before.toTimeString() +
            '...'
        );
        before.setMinutes(before.getMinutes() - 2.5);
        after.setMinutes(after.getMinutes() + 2.5);
        const chats = (
          await db
            .collection('chats')
            .where('chatterUIDs', 'array-contains', responder.uid)
            .where('lastMessage.timestamp', '>=', before)
            .where('lastMessage.timestamp', '<=', after)
            .where('lastMessage.sms', '==', msg.body)
            .orderBy('lastMessage.timestamp', 'desc')
            .limit(1)
            .get()
        ).docs;
        console.log(
          '[DEBUG] ' +
            (chats.length
              ? 'Got matching chat.'
              : 'Could not find a matching chat.')
        );
        // 2) Get and return the lastMessage sentBy user's full data.
        return (
          (
            await db
              .collection('users')
              .doc(chats[0].data().lastMessage.sentBy.uid)
              .get()
          ).data() || chats[0].data().lastMessage.sentBy
        );
      };
      // 2) Route the response to the sender of the last message if it was
      // sent within 5 mins (if it's a bot, send it to the supervisor)
      // otherwise, ask the responder where to route the message.
      const [msg, sender] = await getSender(inbound, outbound);
      console.log('[DEBUG] Got sender of the lastMessage:', sender);
      const supervisor = await Utils.getSupervisorForLocation(sender.location);
      console.log(
        '[DEBUG] Got supervisor (' +
          supervisor.name +
          ' <' +
          supervisor.uid +
          ">) for that sender's location (" +
          sender.location +
          ').'
      );
      const thePastFiveMins = new Date();
      thePastFiveMins.setMinutes(thePastFiveMins.getMinutes() - 5);
      const relay = async (to, msg) => {
        if (to)
          await new Message({
            message: data.Body,
            from: Utils.filterRequestUserData(responder),
            to: Utils.filterRequestUserData(to),
          }).send();
        const smsCount = req.session.counter || 0;
        if (smsCount > 0 || !msg) return res.status(200).end();
        req.session.counter = smsCount + 1;
        const twiml = new MessagingResponse();
        twiml.message(msg);
        return res
          .set({
            'Content-Type': 'text/xml',
          })
          .status(200)
          .send(twiml.toString());
      };
      if (sender.uid === 'operator') {
        // 3) Relay to supervisor if sentBy bot
        console.log(
          '[DEBUG] Forwarding sms msg to supervisor b/c ' +
            'original message was sent by a bot...'
        );
        return relay(
          supervisor,
          'Your message has been forwarded to ' +
            supervisor.name +
            '. ' +
            getPronoun(supervisor.gender) +
            "'ll get back to you as soon as possible."
        );
      } else if (new Date(msg.dateCreated) >= thePastFiveMins) {
        // 3) Relay to sender if w/in 5 mins
        console.log(
          '[DEBUG] Forwarding sms msg to sender of the ' +
            'original message b/c it was sent within 5 mins...'
        );
        return relay(sender);
      } else if (sender.uid === supervisor.uid) {
        // 3) Relay to sender if sender and supervisor are the same
        console.log(
          '[DEBUG] Forwarding sms msg to sender of the ' +
            'original message b/c sender was supervisor...'
        );
        return relay(sender);
      } else {
        // 3) Ask who to relay to
        console.log(
          '[DEBUG] Asking user who they want to forward ' +
            'their sms msg to...'
        );
        return relay(
          null,
          'Do you want to forward your message to ' +
            supervisor.name +
            ' (A) or ' +
            sender.name +
            ' (B)?'
        );
      }
    });
    return app;
  }

  static fallback(req, res) {
    return cors(req, res, async () => {
      console.log(
        '[DEBUG] Responding to request with phone (' +
          req.body.From +
          ') and body (' +
          req.body.Body +
          ')...'
      );
      const twiml = new MessagingResponse().message(ERR_MSG);
      return res
        .set({
          'Content-Type': 'text/xml',
        })
        .status(200)
        .send(twiml.toString());
    });
  }
}

module.exports = SMS;
