'use strict';

// Initializes FriendlyChat
function FriendlyChat() {
  this.checkSetup();

  // Shortcuts to DOM Elements
  this.messageList = document.getElementById('messages');
  this.messageForm = document.getElementById('message-form');
  this.messageInput = document.getElementById('message');
  this.submitButton = document.getElementById('submit');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  // Event listeners
  this.signInButton.addEventListener('click', this.signIn.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.messageInput.addEventListener('keyup', this.toggleButton.bind(this));
  this.messageInput.addEventListener('change', this.toggleButton.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));
  this.submitImageButton.addEventListener('click', e => {
    e.preventDefault();
    this.mediaCapture.click();
  });

  this.initFirebase();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
FriendlyChat.prototype.initFirebase = function() {
  // Shortcuts to Firebase SDK features.
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();

  // Initiates Firebase auth and listen to auth state changes.
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Loads chat messages history and listens for upcoming ones.
FriendlyChat.prototype.loadMessages = function() {
  // TODO(DEVELOPER): Load and listens for new messages.
};

// Saves a new message on the Firebase DB.
FriendlyChat.prototype.saveMessage = function(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (this.messageInput.value && this.checkSignedInWithMessage()) {

    // TODO(DEVELOPER): push new message to Firebase.

  }
};

// Sets the URL of the given img element with the URL of the image stored in Cloud Storage.
FriendlyChat.prototype.setImageUrl = function(imageUri, imgElement) {
  imgElement.src = imageUri;

  // TODO(DEVELOPER): If image is on Cloud Storage, fetch image URL and set img element's src.
};

// Saves a new message containing an image URI in Firebase.
// This first saves the image in Firebase storage.
FriendlyChat.prototype.saveImageMessage = function(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  this.imageForm.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    this.signInSnackbar.MaterialSnackbar.showSnackbar({
      message: 'You can only share images',
      timeout: 2000
    });
    return;
  }
  // Check if the user is signed-in
  if (this.checkSignedInWithMessage()) {

    // TODO(DEVELOPER): Upload image to Firebase storage and add message.

  }
};

FriendlyChat.prototype.signIn = function() {
  // Sign in Firebase using popup auth and Google as the identity provider.
  this.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
};

FriendlyChat.prototype.signOut = function() {
  // Sign out of Firebase.
  this.auth.signOut();
};

FriendlyChat.prototype.onAuthStateChanged = function(user) {
  if (user) { // User is signed in!
    // Set the user's profile pic and name.
    this.userPic.style.backgroundImage = 'url(' + user.photoURL + ')';
    this.userName.textContent = user.displayName;

    // Show user's profile and sign-out button.
    this.userName.removeAttribute('hidden');
    this.userPic.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');

    // Hide sign-in button.
    this.signInButton.setAttribute('hidden', 'true');

    // We load currently existing chat messages.
    this.loadMessages();

    // We save the Firebase Messaging Device token and enable notifications.
    this.saveMessagingDeviceToken();
  }
  else { // User is signed out!
    // Hide user's profile and sign-out button.
    this.userName.setAttribute('hidden', 'true');
    this.userPic.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');

    // Show sign-in button.
    this.signInButton.removeAttribute('hidden');
  }
};

FriendlyChat.prototype.checkSignedInWithMessage = function() {
  // Return true if the user is signed in Firebase
  if (this.auth.currentUser) return true;

  // Display a message to the user using a Toast.
  this.signInSnackbar.MaterialSnackbar.showSnackbar({
    message: 'You must sign-in first',
    timeout: 2000
  });
  return false;
};

// Saves the messaging device token to the datastore.
FriendlyChat.prototype.saveMessagingDeviceToken = function() {
  // TODO(DEVELOPER): Save the device token in the realtime datastore
};

// Requests permissions to show notifications.
FriendlyChat.prototype.requestNotificationsPermissions = function() {
  // TODO(DEVELOPER): Request permissions to send notifications.
};

// Resets the given MaterialTextField.
FriendlyChat.resetMaterialTextfield = function(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// Template for messages.
FriendlyChat.MESSAGE_TEMPLATE =
    '<div class="message-container">' +
      '<div class="spacing"><div class="pic"></div></div>' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
    '</div>';

// A loading image URL.
FriendlyChat.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Displays a Message in the UI.
FriendlyChat.prototype.displayMessage = function(key, name, text, picUrl, imageUri) {
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = FriendlyChat.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');
  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUri) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function() {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }.bind(this));
    this.setImageUrl(imageUri, image);
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in.
  setTimeout(function() {div.classList.add('visible')}, 1);
  this.messageList.scrollTop = this.messageList.scrollHeight;
  this.messageInput.focus();
};

// Enables or disables the submit button depending on the values of the input
// fields.
FriendlyChat.prototype.toggleButton = function() {
  if (this.messageInput.value) this.submitButton.removeAttribute('disabled');
  else this.submitButton.setAttribute('disabled', 'true');
};

// Checks that the Firebase SDK has been correctly setup and configured.
FriendlyChat.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
};

window.onload = _ => { window.friendlyChat = new FriendlyChat(); };
