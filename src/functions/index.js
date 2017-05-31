const admin = require('firebase-admin');
const functions = require('firebase-functions');
const gcs = require('@google-cloud/storage')();
const vision = require('@google-cloud/vision')();
const exec = require('child-process-promise').exec;
const photoUrl = 'images/firebase-logo.png';
admin.initializeApp(functions.config().firebase);

exports.addWelcomeMessages = functions.auth.user().onCreate(event => {
  console.log('A new user signed in for the first time.');
  const fullName = event.data.displayName || 'Anonymous';
  const message = { name:'System Bot', photoUrl, text:fullName+' signed in for the first time! Welcome!' };
  return admin.database().ref('messages').push(message)
    .then(_ => console.log('Message successfully written to chatroom'))
    .catch(_ => console.warn('Message was not successful'));
});

exports.blurOffensiveImages = functions.storage.object().onChange(event => {
  const object = event.data;
  if (object.resourceState === 'not_exists') return console.log('This is a deletion event.');
  else if (!object.name) return console.log('This is a deploy event.');
  const bucket = gcs.bucket(object.bucket);
  const file = bucket.file(object.name);
  return vision.detectSafeSearch(file).then(safeSearchResult => {
    if (safeSearchResult[0].adult || safeSearchResult[0].violence) {
      console.log('The image', object.name, 'has been detected as inappropriate.');
      return blurImage(object.name, bucket);
    }
    else console.log('The image', object.name,'has been detected as OK.');
  }).catch(_ => console.warn('Vision API failed to process image'));
});

function blurImage(filePath, bucket, metadata) {
  const fileName = filePath.split('/').pop();
  const tempLocalFile = `/tmp/${fileName}`;
  const messageId = filePath.split('/')[1];
  return bucket.file(filePath).download({destination: tempLocalFile})
    .then(_ => {
      console.log('Image has been downloaded to', tempLocalFile);
      return exec(`convert ${tempLocalFile} -channel RGBA -blur 0x24 ${tempLocalFile}`);
    }).then(_ => {
      console.log('Image has been blurred');
      return bucket.upload(tempLocalFile, {destination: filePath});
    }).then(_ => {
      console.log('Blurred image has been uploaded to', filePath);
      return admin.database().ref(`/messages/${messageId}`).update({moderated: true});
    }).then(_ => console.log('Marked the image as moderated in the database.'));
}

exports.sendNotifications = functions.database.ref('/messages/{messageId}').onWrite(event => {
  const snapshot = event.data;
  if (snapshot.previous.val()) return;
  const text = snapshot.val().text;
  const payload = {
    notification: {
      title: `${snapshot.val().name} posted ${text ? 'a message' : 'an image'}`,
      body: text ? (text.length <= 100 ? text : text.substring(0, 97) + '...') : '',
      icon: snapshot.val().photoUrl || '/images/profile_placeholder.png',
      click_action: `https://${functions.config().firebase.authDomain}`
    }
  };
  return admin.database().ref('fcmTokens').once('value').then(allTokens => {
    if (allTokens.val()) {
      const tokens = Object.keys(allTokens.val());
      return admin.messaging().sendToDevice(tokens, payload).then(response => {
        const tokensToRemove = [];
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.error('Failure sending notification to', tokens[index], error);
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
              tokensToRemove.push(allTokens.ref.child(tokens[index]).remove());
            }
          }
        });
        return Promise.all(tokensToRemove);
      });
    }
  });
});
