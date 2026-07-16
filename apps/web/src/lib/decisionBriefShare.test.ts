import { describe, expect, it } from "vitest";
import {
  buildDecisionBriefEditUrl,
  buildDecisionBriefShareUrl,
  parseDecisionBriefShareUrl,
  PORTER_RANCH_SAMPLE_BRIEF,
} from "./decisionBriefShare";

describe("decision brief share state", () => {
  it("round-trips the Porter Ranch sample through a bounded brief URL", () => {
    const value = buildDecisionBriefShareUrl(
      PORTER_RANCH_SAMPLE_BRIEF,
      "https://example.com/area",
    );
    const parsed = parseDecisionBriefShareUrl(value);

    expect(new URL(value).pathname).toBe("/brief");
    expect(parsed?.schoolIds).toEqual(PORTER_RANCH_SAMPLE_BRIEF.schoolIds);
    expect(parsed?.options.grade).toBe("10");
    expect(parsed?.options.priorityMultipliers.academics).toBe(1.5);
    expect(parsed?.location.matchedAddress).toBe("Porter Ranch, CA 91326");
  });

  it("builds an editable Area Explorer URL without the brief school list", () => {
    const value = buildDecisionBriefEditUrl(
      PORTER_RANCH_SAMPLE_BRIEF,
      "https://example.com/brief",
    );
    const url = new URL(value);

    expect(url.pathname).toBe("/area");
    expect(url.searchParams.get("view")).toBe("nearby");
    expect(url.searchParams.has("schools")).toBe(false);
  });

  it("rejects malformed, empty, or oversized school selections", () => {
    const valid = new URL(
      buildDecisionBriefShareUrl(
        PORTER_RANCH_SAMPLE_BRIEF,
        "https://example.com/brief",
      ),
    );
    valid.searchParams.set("schools", "bad-id");
    expect(parseDecisionBriefShareUrl(valid.toString())).toBeUndefined();

    valid.searchParams.set(
      "schools",
      "00000000000001,00000000000002,00000000000003,00000000000004",
    );
    expect(parseDecisionBriefShareUrl(valid.toString())).toBeUndefined();
  });
});
