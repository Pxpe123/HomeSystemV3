import { MusicService } from "./MusicService";
import { server, runtime } from "../../application/services";
export const music = new MusicService(server, runtime);
