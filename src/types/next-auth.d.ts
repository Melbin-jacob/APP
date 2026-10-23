import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name?: string | null; image?: string | null; role: Role };
    /** Session version at sign-in; must match User.sessionVersion. */
    sv: number;
    /** When the user last proved who they are (sign-in), epoch seconds. */
    authTime: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: Role;
    sv: number;
    authTime: number;
  }
}
