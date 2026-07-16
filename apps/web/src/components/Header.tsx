import type { MouseEvent } from "react";
import { Icon } from "./Icon";

export type AppPage = "area" | "compare" | "resources";

interface HeaderProps {
  activePage?: AppPage;
  onNavigate?: (page: AppPage) => void;
  onDataFreshness?: () => void;
}

export function Header({
  activePage = "compare",
  onDataFreshness,
  onNavigate,
}: HeaderProps) {
  function navigate(event: MouseEvent<HTMLAnchorElement>, page: AppPage) {
    if (!onNavigate) {
      return;
    }
    event.preventDefault();
    onNavigate(page);
  }

  return (
    <header className="site-header">
      <a
        className="brand"
        href="/"
        aria-label="California School Explorer home"
        onClick={(event) => navigate(event, "compare")}
      >
        California School Explorer
      </a>
      <nav className="primary-navigation" aria-label="Primary navigation">
        <a
          aria-current={activePage === "compare" ? "page" : undefined}
          href="/"
          onClick={(event) => navigate(event, "compare")}
        >
          Compare
        </a>
        <a
          aria-current={activePage === "area" ? "page" : undefined}
          href="/area"
          onClick={(event) => navigate(event, "area")}
        >
          Area Explorer
        </a>
        <a
          aria-current={activePage === "resources" ? "page" : undefined}
          href="/resources"
          onClick={(event) => navigate(event, "resources")}
        >
          Teaching &amp; resources
        </a>
      </nav>
      <nav className="header-links" aria-label="Project links">
        <a
          href="https://github.com/bianrui0315/ca-school-explorer/blob/main/METHODOLOGY.md"
          target="_blank"
          rel="noreferrer"
        >
          Methodology
        </a>
        <a
          href="/#source-details"
          onClick={(event) => {
            if (onDataFreshness) {
              event.preventDefault();
              onDataFreshness();
            }
          }}
        >
          Data freshness
        </a>
      </nav>
      <details className="mobile-menu">
        <summary className="menu-button" aria-label="Open navigation">
          <Icon name="menu" size={27} />
        </summary>
        <nav className="mobile-menu-panel" aria-label="Mobile project links">
          <a
            aria-current={activePage === "compare" ? "page" : undefined}
            href="/"
            onClick={(event) => navigate(event, "compare")}
          >
            Compare
          </a>
          <a
            aria-current={activePage === "area" ? "page" : undefined}
            href="/area"
            onClick={(event) => navigate(event, "area")}
          >
            Area Explorer
          </a>
          <a
            aria-current={activePage === "resources" ? "page" : undefined}
            href="/resources"
            onClick={(event) => navigate(event, "resources")}
          >
            Teaching &amp; resources
          </a>
          <a
            href="https://github.com/bianrui0315/ca-school-explorer/blob/main/METHODOLOGY.md"
            target="_blank"
            rel="noreferrer"
          >
            Methodology
          </a>
          <a
            href="/#source-details"
            onClick={(event) => {
              if (onDataFreshness) {
                event.preventDefault();
                onDataFreshness();
              }
            }}
          >
            Data freshness
          </a>
        </nav>
      </details>
    </header>
  );
}
