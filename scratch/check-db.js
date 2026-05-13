const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tabelle trovate nel database:");
    console.log(tables);
    
    const hasCalendarEvent = tables.some(t => t.table_name === 'CalendarEvent');
    if (hasCalendarEvent) {
      console.log("✅ SUCCESS: La tabella CalendarEvent ESISTE!");
    } else {
      console.log("❌ ERROR: La tabella CalendarEvent NON esiste ancora.");
    }
  } catch (e) {
    console.error("Errore durante il controllo:", e);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
