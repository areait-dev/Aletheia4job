import { getAllJobsAction } from './utils/actions';

async function test() {
  try {
    console.log('Testing import...');
    // We don't even need to call it, just importing it might fail
    console.log('Import successful');
  } catch (e) {
    console.error('Import failed:', e);
  }
}

test();
