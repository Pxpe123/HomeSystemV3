import { Link } from "react-router-dom";
import { Icon } from "../../../shared/ui/Icon";
import "./AppTopBar.css";

/** Display-native heading shared by installed apps, not a floating window bar. */
export default function AppTopBar({ title, description }) {
  return (
    <header className="app-top-bar">
      <div className="app-heading-copy">
        <h1 className="app-title" title={description}>
          {title}
        </h1>
      </div>
      <Link
        className="hs-button secondary app-home-link"
        to="/"
        aria-label="Back to home"
      >
        <Icon name="home" />
        <span>Home</span>
      </Link>
    </header>
  );
}
