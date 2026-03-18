import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import config from './firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function fixData() {
  console.log("Fetching members...");
  const snap = await getDocs(collection(db, 'members'));
  let total = 0;
  
  for (const d of snap.docs) {
    const data = d.data();
    const cap = data.capital_share || 0;
    const ref = data.refund || 0;
    const cbu = data.capital_build_up || 0;
    const expected = cap - ref + cbu;
    
    if (expected !== (data.total_capital_share || 0)) {
      console.log(`Fixing ${data.name} (${data.plate_no}): expected ${expected}, got ${data.total_capital_share}`);
      await updateDoc(doc(db, 'members', d.id), {
        total_capital_share: expected
      });
    }
    total += expected;
  }
  
  console.log("Updating CAPITAL master node to", total);
  await updateDoc(doc(db, 'master_nodes', 'CAPITAL'), {
    balance: total
  });
  
  console.log("Done!");
}

fixData().catch(console.error);
