import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./Header";
import { I18nProvider } from "../i18n";

describe("Header", () => {
  it("shows a global support link and an accessible QR panel", async () => {
    const user = userEvent.setup();
    render(<Header activePage="area" />);

    expect(
      screen.getByRole("link", { name: "Buy me a coffee" }),
    ).toHaveAttribute("href", "https://buymeacoffee.com/bianrui0315");

    const qrTrigger = screen.getByText("QR code");
    await user.click(qrTrigger);

    expect(qrTrigger.closest("details")).toHaveAttribute("open");
    expect(
      screen.getByAltText("QR code for buymeacoffee.com/bianrui0315"),
    ).toHaveAttribute("src", "/buy-me-a-coffee-qr.png");
    expect(
      screen.getByRole("link", { name: "Open Buy Me a Coffee" }),
    ).toHaveAttribute("href", "https://buymeacoffee.com/bianrui0315");
  });

  it("switches the global navigation to Spanish", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <Header activePage="compare" />
      </I18nProvider>,
    );

    await user.click(screen.getAllByRole("button", { name: "ES" })[0]!);

    expect(screen.getAllByRole("link", { name: "Comparar" })[0]).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Explorar zona" })[0],
    ).toBeVisible();
    expect(document.documentElement.lang).toBe("es");
  });
});
