let currentUser = null;

function signInWithGoogle() {
  auth.signInWithPopup(provider)
    .then(() => {})
    .catch(err => {
      console.error('登入失敗:', err);
    });
}

function signOut() {
  auth.signOut().then(() => {
    currentUser = null;
    showLoginScreen();
  });
}

function showLoginScreen() {
  document.getElementById('loginScreen').classList.add('show');
  document.getElementById('appContent').classList.add('hide');
}

function hideLoginScreen() {
  document.getElementById('loginScreen').classList.remove('show');
  document.getElementById('appContent').classList.remove('hide');
}

function updateUserUI(user) {
  const avatar = document.getElementById('userAvatar');
  const name = document.getElementById('userName');
  if (user) {
    avatar.src = user.photoURL || '';
    avatar.alt = user.displayName || '';
    avatar.style.display = user.photoURL ? 'block' : 'none';
    name.textContent = user.displayName || user.email;
  }
}

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    hideLoginScreen();
    updateUserUI(user);
    loadDate();
  } else {
    currentUser = null;
    showLoginScreen();
  }
});
