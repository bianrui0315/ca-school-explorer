import type { MouseEvent } from "react";
import { Icon } from "./Icon";

export type AppPage = "area" | "compare" | "profile" | "resources";

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
    <>
      <aside className="support-strip" aria-label="Support the project">
        <span>Support this independent open-source project</span>
        <a
          className="support-strip-link"
          href="https://buymeacoffee.com/bianrui0315"
          rel="noreferrer"
          target="_blank"
        >
          <Icon name="coffee" size={15} />
          Buy me a coffee
        </a>
        <details className="support-qr">
          <summary>QR code</summary>
          <div className="support-qr-panel">
            <img
              alt="QR code for buymeacoffee.com/bianrui0315"
              height="700"
              loading="lazy"
              src="/buy-me-a-coffee-qr.png"
              width="700"
            />
            <strong>Support California School Explorer</strong>
            <p>Scan the code or open the secure support page.</p>
            <a
              href="https://buymeacoffee.com/bianrui0315"
              rel="noreferrer"
              target="_blank"
            >
              Open Buy Me a Coffee
              <Icon name="external" size={13} />
            </a>
          </div>
        </details>
      </aside>
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
    </>
  );
}
