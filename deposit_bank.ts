import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import config from './firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function depositToBank() {
  console.log("Fetching CAPITAL balance...");
  const capitalDoc = await getDoc(doc(db, 'master_nodes', 'CAPITAL'));
  const capitalBalance = capitalDoc.data()?.balance || 0;
  
  console.log(`Capital balance is ${capitalBalance}. Updating BANK...`);
  await updateDoc(doc(db, 'source_funds', 'BANK'), {
    balance: capitalBalance,
    updated_at: new Date().toISOString()
  });
  
  console.log("Successfully updated BANK balance.");
}

depositToBank().catch(console.error);
