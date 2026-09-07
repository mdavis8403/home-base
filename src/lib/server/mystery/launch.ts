import "server-only";
import midnight from "../../../../content/mysteries/001-midnight-transmission.json";
import crown from "../../../../content/mysteries/002-unity-crown.json";
import music from "../../../../content/mysteries/003-moonlight-showcase.json";
import park from "../../../../content/mysteries/004-starlit-journal.json";
import castle from "../../../../content/mysteries/005-castle-of-five-keys.json";
import { validateMystery } from "../../shared/mystery/schema";
export const launchCases = [midnight, crown, music, park, castle].map(
  validateMystery,
);
