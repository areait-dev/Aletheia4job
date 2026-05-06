const pdf = require('pdf-parse');
const fs = require('fs');

async function test() {
  try {
    // Cerco un file pdf in tmp o assets
    const files = fs.readdirSync('assets');
    const pdfFile = files.find(f => f.endsWith('.pdf'));
    
    if (!pdfFile) {
      console.log('Nessun PDF trovato in assets per il test.');
      return;
    }

    const dataBuffer = fs.readFileSync(`assets/${pdfFile}`);
    const data = await pdf(dataBuffer);
    console.log('Test PDF Parse:', data.text.substring(0, 100));
  } catch (err) {
    console.error('Test PDF Parse Failed:', err);
  }
}

test();
