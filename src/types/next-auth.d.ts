import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    rol: string;
    gymId: string;
    gymNombre?: string;
  }

  interface Session {
    user: {
      id: string;
      rol: string;
      gymId: string;
      gymNombre?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    rol?: string;
    gymId?: string;
    gymNombre?: string;
  }
}
