import type { MouseEvent } from "react";
import { useI18n, type Locale } from "../i18n";
import { Icon } from "./Icon";

export type AppPage = "area" | "brief" | "compare" | "profile" | "resources";

interface HeaderProps {
  activePage?: AppPage;
  onNavigate?: (page: AppPage) => void;
  onDataFreshness?: () => void;
}

function LanguageControl() {
  const { locale, setLocale, t } = useI18n();
  const options: Array<{ label: string; value: Locale }> = [
    { label: "EN", value: "en" },
    { label: "ES", value: "es" },
  ];

  return (
    <div className="language-control" role="group" aria-label={t("Language")}>
      {options.map((option) => (
        <button
          aria-pressed={locale === option.value}
          key={option.value}
          onClick={() => setLocale(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Header({
  activePage = "compare",
  onDataFreshness,
  onNavigate,
}: HeaderProps) {
  const { t } = useI18n();
  function navigate(event: MouseEvent<HTMLAnchorElement>, page: AppPage) {
    if (!onNavigate) {
      return;
    }
    event.preventDefault();
    onNavigate(page);
  }

  return (
    <>
      <aside className="support-strip" aria-label={t("Support the project")}>
        <span>{t("Support this independent open-source project")}</span>
        <a
          className="support-strip-link"
          href="https://buymeacoffee.com/bianrui0315"
          rel="noreferrer"
          target="_blank"
        >
          <Icon name="coffee" size={15} />
          {t("Buy me a coffee")}
        </a>
        <details className="support-qr">
          <summary>{t("QR code")}</summary>
          <div className="support-qr-panel">
            <img
              alt={t("QR code for buymeacoffee.com/bianrui0315")}
              height="700"
              loading="lazy"
              src="/buy-me-a-coffee-qr.png"
              width="700"
            />
            <strong>{t("Support California School Explorer")}</strong>
            <p>{t("Scan the code or open the secure support page.")}</p>
            <a
              href="https://buymeacoffee.com/bianrui0315"
              rel="noreferrer"
              target="_blank"
            >
              {t("Open Buy Me a Coffee")}
              <Icon name="external" size={13} />
            </a>
          </div>
        </details>
      </aside>
      <header className="site-header">
        <a
          className="brand"
          href="/"
          aria-label={t("California School Explorer home")}
          onClick={(event) => navigate(event, "compare")}
        >
          California School Explorer
        </a>
        <nav
          className="primary-navigation"
          aria-label={t("Primary navigation")}
        >
          <a
            aria-current={activePage === "compare" ? "page" : undefined}
            href="/"
            onClick={(event) => navigate(event, "compare")}
          >
            {t("Compare")}
          </a>
          <a
            aria-current={activePage === "area" ? "page" : undefined}
            href="/area"
            onClick={(event) => navigate(event, "area")}
          >
            {t("Area Explorer")}
          </a>
          <a
            aria-current={activePage === "brief" ? "page" : undefined}
            href="/brief"
            onClick={(event) => navigate(event, "brief")}
          >
            {t("Decision Brief")}
          </a>
          <a
            aria-current={activePage === "resources" ? "page" : undefined}
            href="/resources"
            onClick={(event) => navigate(event, "resources")}
          >
            {t("Teaching & resources")}
          </a>
        </nav>
        <nav className="header-links" aria-label={t("Project links")}>
          <LanguageControl />
          <a
            href="https://github.com/bianrui0315/ca-school-explorer/blob/main/METHODOLOGY.md"
            target="_blank"
            rel="noreferrer"
          >
            {t("Methodology")}
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
            {t("Data freshness")}
          </a>
        </nav>
        <details className="mobile-menu">
          <summary className="menu-button" aria-label={t("Open navigation")}>
            <Icon name="menu" size={27} />
          </summary>
          <nav
            className="mobile-menu-panel"
            aria-label={t("Mobile project links")}
          >
            <LanguageControl />
            <a
              aria-current={activePage === "compare" ? "page" : undefined}
              href="/"
              onClick={(event) => navigate(event, "compare")}
            >
              {t("Compare")}
            </a>
            <a
              aria-current={activePage === "area" ? "page" : undefined}
              href="/area"
              onClick={(event) => navigate(event, "area")}
            >
              {t("Area Explorer")}
            </a>
            <a
              aria-current={activePage === "brief" ? "page" : undefined}
              href="/brief"
              onClick={(event) => navigate(event, "brief")}
            >
              {t("Decision Brief")}
            </a>
            <a
              aria-current={activePage === "resources" ? "page" : undefined}
              href="/resources"
              onClick={(event) => navigate(event, "resources")}
            >
              {t("Teaching & resources")}
            </a>
            <a
              href="https://github.com/bianrui0315/ca-school-explorer/blob/main/METHODOLOGY.md"
              target="_blank"
              rel="noreferrer"
            >
              {t("Methodology")}
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
              {t("Data freshness")}
            </a>
          </nav>
        </details>
      </header>
    </>
  );
}
