import "dotenv/config";
import { loadSecrets } from "app/config/secrets.js";

await loadSecrets();

await import("app/workers.js");
