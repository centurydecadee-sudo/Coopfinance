import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, doc, writeBatch, getDoc } from 'firebase/firestore';
import config from './firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function fixDuplicateEarnings() {
  const q = query(collection(db, 'transactions'), where('node_category', '==', 'Retained Earnings (Pre-2026)'));
  const snapshot = await getDocs(q);
  
  if (snapshot.docs.length > 1) {
    console.log(`Found ${snapshot.docs.length} retained earnings transactions. Deleting the extra ones...`);
    
    // Keep the first one, delete the rest
    const docsToKeep = snapshot.docs[0];
    const docsToDelete = snapshot.docs.slice(1);
    
    let totalDeduction = 0;
    const batch = writeBatch(db);
    
    for (const d of docsToDelete) {
      const data = d.data();
      totalDeduction += data.amount || 0;
      batch.delete(d.ref);
    }
    
    if (totalDeduction > 0) {
      // Deduct from BANK
      const bankRef = doc(db, 'source_funds', 'BANK');
      const bankDoc = await getDoc(bankRef);
      const currentBank = bankDoc.data()?.balance || 0;
      batch.update(bankRef, { balance: currentBank - totalDeduction });
      
      // Deduct from INCOME
      const incomeRef = doc(db, 'master_nodes', 'INCOME');
      const incomeDoc = await getDoc(incomeRef);
      const currentIncome = incomeDoc.data()?.balance || 0;
      batch.update(incomeRef, { balance: currentIncome - totalDeduction });
      
      await batch.commit();
      console.log(`Successfully deleted ${docsToDelete.length} duplicates and deducted $${totalDeduction} from BANK and INCOME.`);
    }
  } else {
    console.log("No duplicates found.");
  }
}

fixDuplicateEarnings().catch(console.error);
