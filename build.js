/**
 * Build script for Vercel deployment
 * Generates supabase-config.js from environment variables
 */
const fs = require("fs");

const url = process.env.SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || "";

// Strip trailing /rest/v1/ if present — the SDK adds it automatically
const cleanUrl = url.replace(/\/rest\/v1\/?$/, "");

const config = `window.IGUIDER_SUPABASE = {
  url: "${cleanUrl}",
  anonKey: "${anonKey}"
};
`;

fs.writeFileSync("supabase-config.js", config, "utf8");
console.log("✓ supabase-config.js generated");
console.log("  URL:", cleanUrl || "(not set)");
console.log("  Key:", anonKey ? anonKey.slice(0, 20) + "..." : "(not set)");
