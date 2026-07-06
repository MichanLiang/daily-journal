function userDoc() {
  return db.collection('users').doc(currentUser.uid);
}

function dayDoc(date) {
  return userDoc().collection('days').doc(date);
}

async function loadDayFromFirestore(date) {
  try {
    const snap = await dayDoc(date).get();
    if (snap.exists) {
      return snap.data();
    }
  } catch (e) {
    console.warn('Firestore 讀取失敗:', e);
  }
  return null;
}

async function saveDayToFirestore(date, data) {
  try {
    await dayDoc(date).set(data, { merge: true });
  } catch (e) {
    console.warn('Firestore 寫入失敗:', e);
  }
}

async function loadGoalsFromFirestore() {
  try {
    const snap = await userDoc().collection('meta').doc('goals').get();
    if (snap.exists) return snap.data();
  } catch (e) {
    console.warn('Firestore 讀取 goals 失敗:', e);
  }
  return null;
}

async function saveGoalsToFirestore(data) {
  try {
    await userDoc().collection('meta').doc('goals').set(data, { merge: true });
  } catch (e) {
    console.warn('Firestore 寫入 goals 失敗:', e);
  }
}

async function loadTasksFromFirestore() {
  try {
    const snap = await userDoc().collection('meta').doc('tasks').get();
    if (snap.exists && snap.data().list) return snap.data().list;
  } catch (e) {
    console.warn('Firestore 讀取 tasks 失敗:', e);
  }
  return null;
}

async function saveTasksToFirestore(tasksList) {
  try {
    await userDoc().collection('meta').doc('tasks').set({ list: tasksList }, { merge: true });
  } catch (e) {
    console.warn('Firestore 寫入 tasks 失敗:', e);
  }
}

async function loadReviewsFromFirestore() {
  try {
    const snap = await userDoc().collection('meta').doc('reviews').get();
    if (snap.exists && snap.data().list) return snap.data().list;
  } catch (e) {
    console.warn('Firestore 讀取 reviews 失敗:', e);
  }
  return null;
}

async function saveReviewsToFirestore(reviewsList) {
  try {
    await userDoc().collection('meta').doc('reviews').set({ list: reviewsList }, { merge: true });
  } catch (e) {
    console.warn('Firestore 寫入 reviews 失敗:', e);
  }
}

async function loadSettingsFromFirestore() {
  try {
    const snap = await userDoc().collection('meta').doc('settings').get();
    if (snap.exists) return snap.data();
  } catch (e) {
    console.warn('Firestore 讀取 settings 失敗:', e);
  }
  return null;
}

async function saveSettingsToFirestore(settingsData) {
  try {
    await userDoc().collection('meta').doc('settings').set(settingsData, { merge: true });
  } catch (e) {
    console.warn('Firestore 寫入 settings 失敗:', e);
  }
}
