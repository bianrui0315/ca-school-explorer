import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider, translate, useI18n } from "./i18n";

function Fixture() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div>
      <span>{t("Official public data")}</span>
      <button onClick={() => setLocale(locale === "en" ? "es" : "en")}>
        Switch
      </button>
    </div>
  );
}

describe("I18nProvider", () => {
  it("translates deterministic sentences while preserving school names", () => {
    expect(
      translate("es", "Porter Ranch Community reports all 8 brief indicators."),
    ).toBe("Porter Ranch Community reporta los 8 indicadores del informe.");
  });

  it("switches to Spanish, updates the document language, and persists it", async () => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <Fixture />
      </I18nProvider>,
    );

    expect(screen.getByText("Official public data")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Switch" }));
    expect(screen.getByText("Datos públicos oficiales")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("es");
    expect(window.localStorage.getItem("ca-school-explorer.locale.v1")).toBe(
      "es",
    );
  });
});
