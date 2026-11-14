// Vantage iMessage bot. Receives messages through Photon Spectrum and answers using the
// Vantage backend (/api/photon/chat). Owner: A.
// Run:  npm start            (real iMessage, needs SPECTRUM_PROJECT_ID / SECRET in ../.env)
//       npm run terminal     (test in this terminal, no phone or credentials needed)
import { readFileSync } from "node:fs";
import { Spectrum } from "spectrum-ts";

// Load ../.env without extra packages.
try {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const API = process.env.VANTAGE_API_URL || "http://localhost:8000/api";
const useTerminal = process.argv.includes("--terminal");

let providers;
if (useTerminal) {
  const { terminal } = await import("spectrum-ts/providers/terminal");
  providers = [terminal.config()];
} else {
  const { imessage } = await import("spectrum-ts/providers/imessage");
  providers = [imessage.config()];
}

const app = await Spectrum({
  ...(useTerminal ? {} : {
    projectId: process.env.SPECTRUM_PROJECT_ID,
    projectSecret: process.env.SPECTRUM_PROJECT_SECRET,
  }),
  providers,
});

console.log(`Vantage bot listening (${useTerminal ? "terminal" : "iMessage"}), backend: ${API}`);

for await (const [space, message] of app.messages) {
  if (message.direction === "outbound") continue;
  if (message.content.type !== "text") continue;

  const senderId = message.sender?.id ?? space.id;
  const text = message.content.text;
  console.log(`[in]  ${senderId}: ${text}`);

  try {
    await space.responding(async () => {
      const r = await fetch(`${API}/photon/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender_id: senderId, text }),
      });
      const data = await r.json();
      const reply = data.reply || "Sorry, something went wrong on my side.";
      await space.send(reply);
      console.log(`[out] ${reply.slice(0, 120)}`);
    });
  } catch (e) {
    console.error("[bot] error:", e);
    await space.send("Sorry, I could not reach the documentary right now. Try again in a minute.");
  }
}
