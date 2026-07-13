import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("school comparison experience", () => {
  it("renders the fixture disclosure and initial comparison", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Compare schools across time and context",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fixture data")).toBeInTheDocument();
    expect(screen.getByText("Selected schools (3 of 5)")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "ELA distance from standard" }),
    ).toBeInTheDocument();
  });

  it("changes the metric and student lens", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Attendance/ }));
    await user.selectOptions(
      screen.getByLabelText("Student lens"),
      "english_learners",
    );

    expect(
      screen.getByRole("heading", { name: "Chronic absenteeism rate" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Student lens")).toHaveValue(
      "english_learners",
    );
    expect(screen.getByText("30.1%")).toBeInTheDocument();
  });

  it("adds and removes schools from the comparison", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText("Find a school or district"),
      "Sierra",
    );
    await user.click(
      await screen.findByRole("button", { name: /Sierra Vista School/ }),
    );

    expect(screen.getByText("Selected schools (4 of 5)")).toBeInTheDocument();
    expect(screen.getAllByText("Sierra Vista School").length).toBeGreaterThan(
      1,
    );

    await user.click(
      screen.getByRole("button", { name: "Remove Redwood Creek Elementary" }),
    );
    expect(screen.getByText("Selected schools (3 of 5)")).toBeInTheDocument();
  });

  it("provides project links in the compact navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByLabelText("Open navigation"));

    expect(
      screen.getByRole("navigation", { name: "Mobile project links" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Methodology" })).toHaveLength(
      2,
    );
  });
});
