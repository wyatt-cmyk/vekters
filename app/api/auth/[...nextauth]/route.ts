// Auth.js handles /api/auth/signin, /api/auth/callback/google, /api/auth/signout, etc.
// This file just wires those URLs to the config in auth.ts.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
