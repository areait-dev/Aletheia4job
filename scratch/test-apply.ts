import { applyToJobAction } from '../utils/actions/jobs';

async function testApply() {
  // Cerchiamo un job esistente
  const jobId = 'ce37f7bd-28c9-40ee-a370-6213dae8580a'; // Sviluppatore Backend Node.js
  
  const result = await applyToJobAction({
    jobId,
    firstName: 'Test',
    lastName: 'Candidato',
    email: `test.${Date.now()}@debug.com`,
    city: 'Milano',
    cvUrl: 'https://gbheewcrphqqfopotsxg.supabase.co/storage/v1/object/public/cvs/dh79hdh1895-1778859401675.pdf',
    source: 'Debug Script'
  });

  console.log('RESULT:', result);
}

testApply().catch(console.error);
