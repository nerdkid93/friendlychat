const admin = require('firebase-admin');
const functions = require('firebase-functions');
const photoUrl = 'images/firebase-logo.png';
admin.initializeApp(functions.config().firebase);

exports.addWelcomeMessages = functions.auth.user().onCreate(event => {
  console.log('A new user signed in for the first time.');

  const fullName = event.data.displayName || 'Anonymous';
  const message = { name:'System Bot', photoUrl, text:fullname+' signed in for the first time! Welcome!' };

  return admin.database().ref('messages').push(message)
    .then(_ => console.log('Message successfully written to chatroom'))
    .catch(_ => console.warn('Message was not successful'));
});

// TODO(DEVELOPER): Write the blurOffensiveImages Function here.

// TODO(DEVELOPER): Write the sendNotifications Function here.
