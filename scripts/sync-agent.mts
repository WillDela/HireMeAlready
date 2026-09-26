// Creates or updates the interviewer agent on ElevenLabs from
// src/lib/elevenlabs/interviewer-agent.ts. Usage: npm run agent:sync
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { elevenLabsFetch } from "@/lib/elevenlabs";
import { INTERVIEWER_AGENT_CONFIG } from "@/lib/elevenlabs/interviewer-agent";

const existing = process.env.ELEVENLABS_AGENT_ID;

if (existing) {
  await elevenLabsFetch(`/convai/agents/${existing}`, { method: "PATCH", body: JSON.stringify(INTERVIEWER_AGENT_CONFIG) });
  console.log(`Updated agent ${existing}`);
} else {
  const { agent_id } = await elevenLabsFetch<{ agent_id: string }>("/convai/agents/create", {
    method: "POST",
    body: JSON.stringify(INTERVIEWER_AGENT_CONFIG),
  });
  const env = readFileSync(".env", "utf8").replace(/^ELEVENLABS_AGENT_ID=.*$/m, `ELEVENLABS_AGENT_ID="${agent_id}"`);
  writeFileSync(".env", env);
  console.log(`Created agent ${agent_id} and saved it to .env (also set it in the droplet's .env)`);
}
