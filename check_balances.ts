import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import config from './firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkBalances() {
  const bank = await getDoc(doc(db, 'source_funds', 'BANK'));
  const hand = await getDoc(doc(db, 'source_funds', 'HAND'));
  const lending = await getDoc(doc(db, 'master_nodes', 'LENDING'));
  const capital = await getDoc(doc(db, 'master_nodes', 'CAPITAL'));
  const income = await getDoc(doc(db, 'master_nodes', 'INCOME'));
  const expenses = await getDoc(doc(db, 'master_nodes', 'EXPENSES'));

  console.log(JSON.stringify({
    BANK: bank.data()?.balance || 0,
    HAND: hand.data()?.balance || 0,
    LENDING: lending.data()?.balance || 0,
    CAPITAL: capital.data()?.balance || 0,
    INCOME: income.data()?.balance || 0,
    EXPENSES: expenses.data()?.balance || 0,
  }, null, 2));
}

checkBalances().catch(console.error);
