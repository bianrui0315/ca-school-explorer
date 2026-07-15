import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { School, SchoolSummary } from "../types";
import { SimilarContext } from "./SimilarContext";

function summary(id: string, name: string): SchoolSummary {
  return {
    id,
    name,
    status: "active",
    countyCode: "19",
    county: "Los Angeles",
    districtId: "1964733",
    district: "Los Angeles Unified",
    shard: "19-0",
    city: "Los Angeles",
    gradeSpan: "K–8",
    schoolType: "K-12",
    schoolLevel: "Elem-High Combo",
    charter: false,
    virtualType: "N",
    magnet: false,
    titleI: true,
    dass: false,
    address: { street: "", city: "Los Angeles", state: "CA", zip: "90001" },
    latitude: 34,
    longitude: -118,
    enrollment: 800,
    staff: { total: null, teachers: null, administrators: null },
    peerContext: {
      englishLearnerPercent: 20,
      studentsWithDisabilitiesPercent: 12,
      socioeconomicallyDisadvantagedPercent: 55,
    },
  };
}

function selectedSchool(id: string, name: string, color: string): School {
  return {
    ...summary(id, name),
    color,
    demographics: {},
    metrics: {},
  };
}

describe("SimilarContext", () => {
  it("switches anchors, enables the peer reference, and adds a match", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onAnchorChange = vi.fn();
    const onUseBaseline = vi.fn();
    const selectedSchools = [
      selectedSchool("anchor-1", "Anchor One", "#ff625e"),
      selectedSchool("anchor-2", "Anchor Two", "#f2a900"),
    ];

    render(
      <SimilarContext
        anchorId="anchor-1"
        baselineCount={6}
        baselineReady
        isBaselineActive={false}
        isLoading={false}
        matches={[
          {
            school: summary("peer-1", "Context Peer"),
            reasons: [
              "Same K–8 grade span",
              "Enrollment within 4%",
              "EL share within 2 points",
            ],
          },
        ]}
        onAdd={onAdd}
        onAnchorChange={onAnchorChange}
        onUseBaseline={onUseBaseline}
        selectedSchools={selectedSchools}
      />,
    );

    expect(
      screen.getByText("Outcomes are excluded from matching."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ranking/i)).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Similar context anchor school"),
      "anchor-2",
    );
    await user.click(
      screen.getByRole("button", { name: "Use 6-school peer baseline" }),
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onAnchorChange).toHaveBeenCalledWith("anchor-2");
    expect(onUseBaseline).toHaveBeenCalledOnce();
    expect(onAdd).toHaveBeenCalledWith("peer-1");
  });
});
