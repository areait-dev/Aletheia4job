import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportCandidateToPDF = async (candidate: any) => {
  const element = document.createElement('div');
  element.style.padding = '40px';
  element.style.width = '800px';
  element.style.background = 'white';
  element.style.color = '#333';
  element.style.fontFamily = 'Arial, sans';
  
  element.innerHTML = `
    <div style="border: 2px solid #008C95; padding: 30px; border-radius: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #008C95; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <h1 style="color: #008C95; margin: 0; font-size: 28px;">Job Aletheia</h1>
          <p style="margin: 5px 0 0 0; color: #666;">Scheda Tecnica Candidato</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-weight: bold;">Data Export: ${new Date().toLocaleDateString('it-IT')}</p>
        </div>
      </div>

      <div style="margin-bottom: 40px;">
        <h2 style="background: #f0fafa; padding: 10px; border-left: 5px solid #008C95;">Dati Anagrafici</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 10px; width: 50%;"><strong>Nome:</strong> ${candidate.firstName}</td>
            <td style="padding: 10px;"><strong>Cognome:</strong> ${candidate.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 10px;"><strong>Email:</strong> ${candidate.email}</td>
            <td style="padding: 10px;"><strong>Telefono:</strong> ${candidate.phone || 'N/D'}</td>
          </tr>
          <tr>
            <td style="padding: 10px;" colspan="2"><strong>Residenza:</strong> ${candidate.city} ${candidate.province ? `(${candidate.province.toUpperCase()})` : ''}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 40px;">
        <h2 style="background: #f0fafa; padding: 10px; border-left: 5px solid #008C95;">Profilo Professionale</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 10px; width: 50%;"><strong>Ruolo:</strong> ${candidate.role}</td>
            <td style="padding: 10px;"><strong>Settore:</strong> ${candidate.sector}</td>
          </tr>
          <tr>
            <td style="padding: 10px;"><strong>Seniority:</strong> ${candidate.seniority}</td>
            <td style="padding: 10px;"><strong>Titolo di Studio:</strong> ${candidate.education || 'N/D'}</td>
          </tr>
          <tr>
            <td style="padding: 10px;" colspan="2"><strong>Aspettativa Economica (RAL):</strong> ${candidate.expectedSalary ? `€${candidate.expectedSalary.toLocaleString('it-IT')}` : 'N/D'}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 40px;">
        <h2 style="background: #f0fafa; padding: 10px; border-left: 5px solid #008C95;">Competenze e Stato</h2>
        <div style="padding: 15px;">
          <p><strong>Hard Skills:</strong> ${candidate.skills || 'Non specificate'}</p>
          <p><strong>Stato Attuale:</strong> <span style="color: #008C95; font-weight: bold;">${candidate.status}</span></p>
        </div>
      </div>

      <div>
        <h2 style="background: #f0fafa; padding: 10px; border-left: 5px solid #008C95;">Note Interne / Valutazione</h2>
        <div style="padding: 15px; background: #fafafa; border-radius: 5px; min-height: 100px;">
          ${candidate.notes ? candidate.notes.replace(/\n/g, '<br>') : 'Nessuna nota presente.'}
        </div>
      </div>

      <div style="margin-top: 50px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
        Documento generato automaticamente dal sistema Job Aletheia Candidate Management.
      </div>
    </div>
  `;

  document.body.appendChild(element);
  
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`scheda_${candidate.lastName}_${candidate.firstName}.pdf`);
  } finally {
    document.body.removeChild(element);
  }
};
