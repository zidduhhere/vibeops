import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  beforeSessionSaved: async (session, idToken) => {
    if (idToken) {
      const parts = idToken.split(".");
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString()
      );
      const insforgeToken = payload["https://insforge.dev/insforge_token"];
      if (insforgeToken) {
        session.user = {
          ...session.user,
          "https://insforge.dev/insforge_token": insforgeToken,
        };
      }
    }
    return session;
  },
});
