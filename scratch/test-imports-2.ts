import * as actions from '../utils/actions';

async function test() {
  try {
    console.log('Testing comprehensive import...');
    const keys = Object.keys(actions);
    console.log(`Successfully imported ${keys.length} actions.`);
    console.log('Keys:', keys.slice(0, 5), '...');
  } catch (e) {
    console.error('Import failed:', e);
    process.exit(1);
  }
}

test();
