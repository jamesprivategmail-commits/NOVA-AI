import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function inspectAndClean() {
  console.log("Checking 'broadcasts' collection...");
  try {
    const snap = await getDocs(collection(db, 'broadcasts'));
    console.log(`Found ${snap.size} documents in 'broadcasts'.`);
    for (const d of snap.docs) {
      console.log(`Deleting broadcast: ${d.id} ->`, d.data());
      await deleteDoc(d.ref);
    }
  } catch (e: any) {
    console.error("Error with 'broadcasts':", e.message);
  }

  console.log("Checking 'announcements' collection...");
  try {
    const snap2 = await getDocs(collection(db, 'announcements'));
    console.log(`Found ${snap2.size} documents in 'announcements'.`);
    for (const d of snap2.docs) {
      console.log(`Deleting announcement: ${d.id} ->`, d.data());
      await deleteDoc(d.ref);
    }
  } catch (e: any) {
    console.error("Error with 'announcements':", e.message);
  }

  console.log("Checking 'settings' collection for announcements...");
  try {
    const snap3 = await getDocs(collection(db, 'settings'));
    for (const d of snap3.docs) {
      console.log(`Setting doc ${d.id}:`, Object.keys(d.data()));
      if (d.id === 'announcements' || d.id === 'broadcast' || d.id === 'broadcasts') {
        console.log(`Deleting setting doc: ${d.id}`);
        await deleteDoc(d.ref);
      }
    }
  } catch (e: any) {
    console.error("Error with 'settings':", e.message);
  }

  console.log("Done checking and cleaning announcements.");
  process.exit(0);
}

inspectAndClean();
