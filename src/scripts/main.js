'use strict';
function FriendlyChat() {
  this.checkSetup();
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.submitButton = document.getElementById('submit');
  this.messageInput = document.getElementById('message');
  this.messageList = document.getElementById('messages');
  this.imageForm = document.getElementById('image-form');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.messageForm = document.getElementById('message-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.submitImageButton = document.getElementById('submitImage');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');
  this.signInButton.addEventListener('click', this.signIn.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.messageInput.addEventListener('keyup', this.toggleButton.bind(this));
  this.messageInput.addEventListener('change', this.toggleButton.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));
  this.submitImageButton.addEventListener('click', e => { e.preventDefault(); this.mediaCapture.click(); });
  this.initFirebase();
}

FriendlyChat.prototype.initFirebase = function() {
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

FriendlyChat.prototype.loadMessages = function() {
  this.messagesRef = this.database.ref('messages');
  this.messagesRef.off();
  let setMessage = data => {
    const val = data.val();
    this.displayMessage(data.key, val.name, val.text, val.photoUrl, val.imageUrl);
  };
  this.messagesRef.limitToLast(12).on('child_added', setMessage);
  this.messagesRef.limitToLast(12).on('child_changed', setMessage);
};

FriendlyChat.prototype.saveMessage = function(e) {
  e.preventDefault();
  if (this.messageInput.value && this.checkSignedInWithMessage()) {
    const currentUser = this.auth.currentUser;
    this.messagesRef.push({
      name: currentUser.displayName,
      text: this.messageInput.value,
      photoUrl: currentUser.photoURL || FriendlyChat.PLACEHOLDER_PNG
    }).then(_ => {
      FriendlyChat.resetMaterialTextfield(this.messageInput);
      this.toggleButton();
    }).catch(e => console.error('Error writing new message to Firebase Database', e));
  }
};

FriendlyChat.prototype.setImageUrl = function(imageUri, imgElement) {
  if (imageUri.startsWith('gs://')) {
    imgElement.src = FriendlyChat.LOADING_IMAGE_URL;
    this.storage.refFromURL(imageUri).getMetadata()
      .then(metadata => imgElement.src = metadata.downloadURLs[0]);
  }
  else imgElement.src = imageUri;
};

FriendlyChat.prototype.saveImageMessage = function(event) {
  event.preventDefault();
  var file = event.target.files[0];
  this.imageForm.reset();
  if (!file.type.match('image.*')) {
    this.signInSnackbar.MaterialSnackbar.showSnackbar({
      message: 'You can only share images',
      timeout: 2000
    });
    return;
  }
  if (this.checkSignedInWithMessage()) {
    var currentUser = this.auth.currentUser;
    this.messagesRef.push({
      name: currentUser.displayName,
      imageUrl: FriendlyChat.LOADING_IMAGE_URL,
      photoUrl: currentUser.photoURL || FriendlyChat.PLACEHOLDER_PNG
    }).then(data => this.storage.ref(currentUser.uid+'/'+data.key+'/'+file.name).put(file)
      .then(snapshot => data.update({imageUrl: this.storage.ref(snapshot.metadata.fullPath).toString()})))
    .catch(e => console.error('There was an error uploading a file to Cloud Storage:', e));
  }
};

FriendlyChat.prototype.signIn = function() {
  this.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
};

FriendlyChat.prototype.signOut = function() {
  this.auth.signOut();
};

FriendlyChat.prototype.onAuthStateChanged = function(user) {
  if (user) {
    this.userName.textContent = user.displayName;
    this.userPic.style.backgroundImage = 'url(' + user.photoURL + ')';
    this.userPic.removeAttribute('hidden');
    this.userName.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');
    this.signInButton.setAttribute('hidden', 'true');
    this.loadMessages();
    this.saveMessagingDeviceToken();
  }
  else {
    this.userPic.setAttribute('hidden', 'true');
    this.userName.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');
    this.signInButton.removeAttribute('hidden');
  }
};

FriendlyChat.prototype.checkSignedInWithMessage = function() {
  if (this.auth.currentUser) return true;
  this.signInSnackbar.MaterialSnackbar.showSnackbar({
    message: 'You must sign-in first',
    timeout: 2000
  });
  return false;
};

FriendlyChat.prototype.saveMessagingDeviceToken = function() {
  firebase.messaging().getToken().then(currentToken => {
    if (currentToken) {
      console.log('Got FCM device token:', currentToken);
      firebase.database().ref('/fcmTokens').child(currentToken).set(firebase.auth().currentUser.uid);
    }
    else this.requestNotificationsPermissions();
  }).catch(e => console.error('Unable to get messaging token.', e));
};

FriendlyChat.prototype.requestNotificationsPermissions = function() {
  console.log('Requesting notifications permission...');
  firebase.messaging().requestPermission()
    .then(_ => this.saveMessagingDeviceToken())
    .catch(e => console.error('Unable to get permission to notify.', e));
};

FriendlyChat.resetMaterialTextfield = element => {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

FriendlyChat.PLACEHOLDER_PNG = '/images/profile_placeholder.png';
FriendlyChat.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';
FriendlyChat.MESSAGE_TEMPLATE = 
`<div class="message-container">
  <div class="spacing"><div class="pic"></div></div>
  <div class="message"></div>
  <div class="name"></div>
</div>`;

FriendlyChat.prototype.displayMessage = function(key, name, text, picUrl, imageUri) {
  let div = document.getElementById(key);
  if (!div) {
    const container = document.createElement('div');
    container.innerHTML = FriendlyChat.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }
  if (picUrl) div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  div.querySelector('.name').textContent = name;
  const messageElement = div.querySelector('.message');
  if (text) {
    messageElement.textContent = text;
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  }
  else if (imageUri) {
    var image = document.createElement('img');
    image.addEventListener('load', _ => this.messageList.scrollTop = this.messageList.scrollHeight);
    this.setImageUrl(imageUri, image);
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  setTimeout(_ => div.classList.add('visible'), 1);
  this.messageList.scrollTop = this.messageList.scrollHeight;
  this.messageInput.focus();
};

FriendlyChat.prototype.toggleButton = function() {
  if (this.messageInput.value) this.submitButton.removeAttribute('disabled');
  else this.submitButton.setAttribute('disabled', 'true');
};

FriendlyChat.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
};

window.onload = _ => { window.friendlyChat = new FriendlyChat(); };
