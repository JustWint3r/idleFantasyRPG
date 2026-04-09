import { performSummon } from './summonEngine.ts';
import type { SummonState } from './summonEngine.ts';

const testPityCombined = () => {
  let state: SummonState = { pityCount: 99, pityACount: 9 }; // One pull away from S-tier pity and A-tier pity
  const { result, newState } = performSummon(state);
  
  console.log('\nTesting Both Pity Trigger at 100 pulls:');
  console.log('Character:', result.character.name);
  console.log('Is Pity:', result.isPity);
  console.log('Is PityA:', result.isPityA);
  console.log('New Pity Count:', newState.pityCount);
  console.log('New PityA Count:', newState.pityACount);

  if (result.character.rarity === 'S' && result.isPity === true && newState.pityCount === 0) {
    console.log('✅ Pity test passed!');
  } else {
    console.log('❌ Pity test failed!');
  }

  if (newState.pityACount === 0) {
    console.log('✅ PityA reset on S-tier pity test passed!');
  } else {
    console.log('❌ PityA reset on S-tier pity test failed!');
  }
};

const testPity = () => {
  let state: SummonState = { pityCount: 99, pityACount: 0 }; // One pull away from S-tier pity
  const { result, newState } = performSummon(state);
  
  console.log('\nTesting S-tier Pity Trigger at 100 pulls:');
  console.log('Character:', result.character.name);
  console.log('Is Pity:', result.isPity);
  console.log('Is PityA:', result.isPityA);
  console.log('New Pity Count:', newState.pityCount);
  console.log('New PityA Count:', newState.pityACount);

  if (result.character.rarity === 'S' && result.isPity === true && newState.pityCount === 0) {
    console.log('✅ Pity test passed!');
  } else {
    console.log('❌ Pity test failed!');
  }

  if (newState.pityACount === 0) {
    console.log('✅ PityA reset on S-tier pity test passed!');
  } else {
    console.log('❌ PityA reset on S-tier pity test failed!');
  }
};

const testPityA = () => {
  let state: SummonState = { pityCount: 0, pityACount: 9 }; // One pull away from A-tier pity
  const { result, newState } = performSummon(state);
  
  console.log('\nTesting A-tier Pity Trigger at 10 pulls:');
  console.log('Character:', result.character.name);
  console.log('Is Pity:', result.isPity);
  console.log('Is PityA:', result.isPityA);
  console.log('New Pity Count:', newState.pityCount);
  console.log('New PityA Count:', newState.pityACount);

  if (result.character.rarity === 'A' && result.isPityA === true && newState.pityACount === 0) {
    console.log('✅ A-tier Pity test passed!');
  } else {
    console.log('❌ A-tier Pity test failed!');
  }

  if (newState.pityCount === 1) {
    console.log('✅ Pity count incremented correctly on A-tier pity test passed!');
  } else {
    console.log('❌ Pity count incremented correctly on A-tier pity test failed!');
  }
};

const testNaturalPull = () => {
  let state: SummonState = { pityCount: 0, pityACount: 0 }; // Fresh state for natural pull
  const { result, newState } = performSummon(state);
  
  console.log('\nTesting Natural Pull:');
  console.log('Character:', result.character.name);
  console.log('Pity Count:', newState.pityCount);
  console.log('PityA Count:', newState.pityACount);
  
  if (newState.pityCount === 1) {
    console.log('✅ Natural pull count incremented correctly.');
  } else {
    console.log('❌ Natural pull failed.');
  }

  if (newState.pityACount === 1) {
    console.log('✅ Natural pull A-tier count incremented correctly.');
  } else {
    console.log('❌ Natural pull A-tier count failed.');
  }
};

testPityCombined();
testPity();
testPityA();
testNaturalPull();
