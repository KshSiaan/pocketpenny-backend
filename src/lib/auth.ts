import "dotenv/config";
import { betterAuth, type Auth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db.js";
import * as schema from "../db/schema.js";
import { openAPI } from "better-auth/plugins"
import { admin as AdminPlugin } from "better-auth/plugins"

const authOptions: BetterAuthOptions = {
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: ["*"],
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    plugins: [
        openAPI(),
        AdminPlugin()
    ]
};

export const auth: Auth<typeof authOptions> = betterAuth(authOptions);