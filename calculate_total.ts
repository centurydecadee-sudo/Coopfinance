import { INITIAL_MEMBERS } from './lib/initial_members';

let calculatedTotal = 0;
let jsonTotal = 0;

for (const m of INITIAL_MEMBERS) {
  const cap = m.capital_share || 0;
  const ref = m.refund || 0;
  const cbu = m.capital_build_up || 0;
  const expected = cap - ref + cbu;
  
  if (expected !== (m.total_capital_share || 0)) {
    console.log(`Mismatch for ${m.name} (${m.plate_no}): expected ${expected}, got ${m.total_capital_share}`);
  }
  
  calculatedTotal += expected;
  jsonTotal += (m.total_capital_share || 0);
}

console.log("Calculated Total:", calculatedTotal);
console.log("JSON Total:", jsonTotal);
