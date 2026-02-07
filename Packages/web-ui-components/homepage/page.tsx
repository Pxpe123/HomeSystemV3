// page.tsx
import SwipeContainer from "./components/SwipeContainer";
import "./home.css";

export default function Home() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        touchAction: "pan-x",       // allows smooth horizontal swipes
        backgroundImage: "url('/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        willChange: "transform",     // hints GPU to optimize layers
      }}
    >
      <SwipeContainer />
    </div>
  );
}
