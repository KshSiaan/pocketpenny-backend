import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db.js";
import * as schema from "../db/schema.js";
import { openAPI } from "better-auth/plugins"
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    // trustedOrigins: ["http://localhost:3000", "http://localhost:3001", "*"],
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    plugins: [
        openAPI(),
    ]

});