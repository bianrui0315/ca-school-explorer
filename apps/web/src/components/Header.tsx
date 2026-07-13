import { Icon } from "./Icon";

interface HeaderProps {
  onDataFreshness?: () => void;
}

export function Header({ onDataFreshness }: HeaderProps) {
  return (
    <header className="site-header">
      <a
        className="brand"
        href="#top"
        aria-label="California School Explorer home"
      >
        California School Explorer
      </a>
      <nav className="header-links" aria-label="Project links">
        <a
          href="https://github.com/bianrui0315/ca-school-explorer/blob/main/METHODOLOGY.md"
          target="_blank"
          rel="noreferrer"
        >
          Methodology
        </a>
        <button
          type="button"
          onClick={onDataFreshness}
          disabled={!onDataFreshness}
        >
          Data freshness
        </button>
      </nav>
      <details className="mobile-menu">
        <summary className="menu-button" aria-label="Open navigation">
          <Icon name="menu" size={27} />
        </summary>
        <nav className="mobile-menu-panel" aria-label="Mobile project links">
          <a
            href="https://github.com/bianrui0315/ca-school-explorer/blob/main/METHODOLOGY.md"
            target="_blank"
            rel="noreferrer"
          >
            Methodology
          </a>
          <button
            type="button"
            onClick={onDataFreshness}
            disabled={!onDataFreshness}
          >
            Data freshness
          </button>
        </nav>
      </details>
    </header>
  );
}
