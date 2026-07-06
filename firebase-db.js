function showSyncError(msg) {
  console.error('[Firestore]', msg);
  let bar = document.getElementById('syncErrorBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'syncErrorBar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#e74c3c;color:#fff;padding:8px 16px;font-size:13px;text-align:center;font-family:Noto Serif TC,serif;';
    document.body.appendChild(bar);
  }
  bar.textContent = msg;
  bar.style.display = 'block';
  setTimeout(() => { bar.style.display = 'none'; }, 6000);
}

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
    showSyncError('日資料讀取失敗: ' + e.message);
  }
  return null;
}

async function saveDayToFirestore(date, data) {
  try {
    await dayDoc(date).set(data, { merge: true });
  } catch (e) {
    showSyncError('日資料寫入失敗: ' + e.message);
  }
}

async function loadGoalsFromFirestore() {
  try {
    const snap = await userDoc().collection('meta').doc('goals').get();
    if (snap.exists) return snap.data();
  } catch (e) {
    showSyncError('目標讀取失敗: ' + e.message);
  }
  return null;
}

async function saveGoalsToFirestore(data) {
  try {
    await userDoc().collection('meta').doc('goals').set(data, { merge: true });
  } catch (e) {
    showSyncError('目標寫入失敗: ' + e.message);
  }
}

async function loadTasksFromFirestore() {
  try {
    const snap = await userDoc().collection('meta').doc('tasks').get();
    if (snap.exists && snap.data().list) return snap.data().list;
  } catch (e) {
    showSyncError('任務讀取失敗: ' + e.message);
  }
  return null;
}

async function saveTasksToFirestore(tasksList) {
  try {
    await userDoc().collection('meta').doc('tasks').set({ list: tasksList }, { merge: true });
  } catch (e) {
    showSyncError('任務寫入失敗: ' + e.message);
  }
}

async function loadReviewsFromFirestore() {
  try {
    const snap = await userDoc().collection('meta').doc('reviews').get();
    if (snap.exists && snap.data().list) return snap.data().list;
  } catch (e) {
    showSyncError('檢討讀取失敗: ' + e.message);
  }
  return null;
}

async function saveReviewsToFirestore(reviewsList) {
  try {
    await userDoc().collection('meta').doc('reviews').set({ list: reviewsList }, { merge: true });
  } catch (e) {
    showSyncError('檢討寫入失敗: ' + e.message);
  }
}

async function loadSettingsFromFirestore() {
  try {
    const snap = await userDoc().collection('meta').doc('settings').get();
    if (snap.exists) return snap.data();
  } catch (e) {
    showSyncError('設定讀取失敗: ' + e.message);
  }
  return null;
}

async function saveSettingsToFirestore(settingsData) {
  try {
    await userDoc().collection('meta').doc('settings').set(settingsData, { merge: true });
  } catch (e) {
    showSyncError('設定寫入失敗: ' + e.message);
  }
}
