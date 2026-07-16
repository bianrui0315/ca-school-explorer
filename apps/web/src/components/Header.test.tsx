import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./Header";

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
});
