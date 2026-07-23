#!/usr/bin/env node
// One-time script to get a Google OAuth refresh token for Calendar API access.
// Usage: node scripts/google-auth.mjs
//
// You need GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set in your environment,
// or just hardcode them temporarily below.

import * as readline from "readline";
import * as https from "https";
import * as querystring from "querystring";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars first.");
  process.exit(1);
}

const SCOPE = "https://www.googleapis.com/auth/calendar";
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob"; // desktop/OOB flow

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log("\n1. Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n2. Grant access, then paste the code below.\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste code: ", async (code) => {
  rl.close();

  const postData = querystring.stringify({
    code: code.trim(),
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const options = {
    hostname: "oauth2.googleapis.com",
    path: "/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      const json = JSON.parse(data);
      if (json.error) {
        console.error("Error:", json.error, json.error_description);
        return;
      }
      console.log("\n✓ Success! Add these to Vercel environment variables:\n");
      console.log(`GOOGLE_REFRESH_TOKEN=${json.refresh_token}`);
      console.log("\nAlso make sure you have:");
      console.log("  GOOGLE_CLIENT_ID=<your client id>");
      console.log("  GOOGLE_CLIENT_SECRET=<your client secret>");
      console.log("  GOOGLE_CALENDAR_ID=primary  (or your specific calendar ID)");
    });
  });

  req.write(postData);
  req.end();
});
