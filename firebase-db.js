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
    console.warn('Firestore 讀取失敗，使用離線資料:', e);
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
