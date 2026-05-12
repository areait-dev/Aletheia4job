"use server";

import { redirect } from "next/navigation";
import { getAuthContext } from "../authz";

export async function authenticateAndRedirect() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  return auth;
}
