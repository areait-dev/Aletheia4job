import { MembershipRole } from "@prisma/client";
import { 
  canAccessDocuments, 
  canApproveAbsence, 
  canAccessAdmin 
} from "../utils/authz";

async function testRBAC() {
  console.log("=== RBAC TEST SUITE ===");

  const roles = [
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MANAGER,
    MembershipRole.RECRUITER, // Trattato come 'USER'
    MembershipRole.VIEWER
  ];

  roles.forEach(role => {
    console.log(`\nTesting Role: ${role}`);
    console.log(`- canAccessDocuments: ${canAccessDocuments(role) ? "✅ YES" : "❌ NO"}`);
    console.log(`- canApproveAbsence:   ${canApproveAbsence(role) ? "✅ YES" : "❌ NO"}`);
    console.log(`- canAccessAdmin:      ${canAccessAdmin(role) ? "✅ YES" : "❌ NO"}`);
  });

  console.log("\n=== VERIFICA SPECIFICA RICHIESTA: USER (RECRUITER) ===");
  const isUser = MembershipRole.RECRUITER;
  
  if (!canAccessDocuments(isUser)) {
    console.log("✅ SUCCESS: USER non può accedere ai documenti.");
  } else {
    console.log("❌ FAILURE: USER può accedere ai documenti!");
  }

  if (!canApproveAbsence(isUser)) {
    console.log("✅ SUCCESS: USER non può approvare presenze.");
  } else {
    console.log("❌ FAILURE: USER può approvare presenze!");
  }

  console.log("\n=== TEST COMPLETATO ===");
}

testRBAC();
