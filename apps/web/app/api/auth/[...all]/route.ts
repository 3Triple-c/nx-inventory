import { auth } from "@nx-inventory/auth";
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth);

