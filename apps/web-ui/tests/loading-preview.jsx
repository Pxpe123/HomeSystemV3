// Vite-only visual fixture: inspect a genuine pending state without delaying real apps.
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { faSpotify } from "@fortawesome/free-brands-svg-icons";
import { AppLoading } from "../src/shared/ui/AppState";
import "../src/index.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <div className="MainContainer MainContainer-ImageBG">
      <AppLoading title="Spotify" icon={faSpotify} color="#1DB954" />
    </div>
  </BrowserRouter>,
);
