import { Link } from "react-router-dom";
import { Icon } from "./Icon";
import "./primitives.css";
export function IntegrationWidget({ title, id, icon, className, description }) {
  return (
    <section
      className={`${className} hs-integration-widget`}
      aria-label={title}
    >
      <header>
        <span>
          <Icon name={icon} />
          {title}
        </span>
        <span className="hs-integration-label">Not configured</span>
      </header>
      <div>
        <span className="hs-integration-mark">
          <Icon name={icon} />
        </span>
        <p>{description}</p>
        <Link className="hs-button secondary" to={`/app/${id}`}>
          Open {title}
          <Icon name="arrow" />
        </Link>
      </div>
    </section>
  );
}
