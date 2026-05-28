import { createClient } from "@insforge/sdk";
import { auth0 } from "@/lib/auth0";

export async function createInsForgeClient() {
  const session = await auth0.getSession();
  const insforgeToken =
    session?.user?.["https://insforge.dev/insforge_token"] as
      | string
      | undefined;

  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    edgeFunctionToken: insforgeToken,
  });
}
