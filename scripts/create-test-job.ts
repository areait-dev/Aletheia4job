// scripts/create-test-job.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestJob() {
  console.log('🚀 Avvio creazione Organizzazione e Job...');

  try {
    const orgId = 'org_prod_123'; // L'ID dell'organizzazione
    const orgName = 'My Test Company';
    
    // Generiamo un ID utente fittizio (non serve che esista nel DB se non c'è relazione)
    // Se però hai vincoli unici su userId, dovrai usarne uno esistente.
    // Qui usiamo un UUID casuale per sicurezza.
    const fakeUserId = 'user-fake-' + Math.random().toString(36).substr(2, 9); 

    // 1. Crea o Trova l'ORGANIZZAZIONE (Obbligatorio per la FK)
    let organization = await prisma.organization.upsert({
      where: { id: orgId },
      update: {},
      create: {
        id: orgId,
        name: orgName,
        // Nota: Se ci sono altri campi obbligatori in Organization (es. clerkOrganizationId), aggiungi qui.
        // Per ora assumiamo che solo id e name siano sufficienti.
      }
    });
    console.log(`✅ Organizzazione creata/trovata: ${organization.name} (${organization.id})`);

    // 2. Crea il JOB
    const newJob = await prisma.job.create({
      data: {
        userId: fakeUserId, // ID fittizio valido come stringa
        
        organizationId: orgId, 
        
        title: 'Sviluppatore Backend Node.js',
        company: orgName,
        location: 'Milano',
        locationFormatted: 'Milano, IT', // Campo richiesto dallo schema
        city: 'Milano',
        province: 'MI',
        country: 'IT',
        
        description: 'Stiamo cercando uno sviluppatore esperto in Node.js per lavorare su microservici scalabili.',
        requirements: 'Esperienza TypeScript, Git, Docker. Conoscenza di API REST.',
        responsibilities: 'Sviluppo API, ottimizzazione database, testing.',
        
        sector: 'Informatica', 
        industry: 'Software', // Campo richiesto dallo schema
        mode: 'Ibrido', 
        
        status: 'Aperto',
        isActive: true,
        postToLinkedIn: true,
        applicationUrl: 'https://example.com/apply/job-test-01?source=linkedin_limited',
        
        // Altri campi opzionali ma consigliati
        salaryMin: 35000,
        salaryMax: 50000,
        salaryCurrency: 'EUR',
        experienceLevel: 'Mid-Senior',
      }
    });

    console.log('✅ JOB CREATO CON SUCCESSO NEL DATABASE!');
    console.log('Dettaglio:', JSON.stringify(newJob, null, 2));
    
    return newJob;

  } catch (error) {
    console.error('❌ ERRORE CREAZIONE:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestJob();