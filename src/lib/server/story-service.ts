import "server-only";
import { database } from "./db";
import { StoryService } from "./story/service";
export function storyService() {
  return new StoryService(database());
}
