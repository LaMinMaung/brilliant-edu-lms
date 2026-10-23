import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../services/curriculum", () => ({ createActivity: vi.fn().mockResolvedValue({ id: "act-new" }) }));

import { createActivity } from "../../services/curriculum";
import { ActivityCreateModal } from "./ActivityCreateModal";

describe("ActivityCreateModal", () => {
  it("creates a draft quiz with pass-based completion by default", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithRouter(<ActivityCreateModal open onClose={vi.fn()} courseId="c1" sectionId="s1" nextOrder={4} onCreated={onCreated} />);
    await user.click(screen.getByRole("radio", { name: /Quiz/ }));
    expect(screen.getByLabelText("Completion")).toHaveValue("pass");
    await user.type(screen.getByLabelText(/Title/), "Unit 1 check");
    await user.click(screen.getByRole("button", { name: "Create & edit" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("act-new"));
    expect(createActivity).toHaveBeenCalledWith({ course: "c1", section: "s1", type: "quiz", title: "Unit 1 check", completion_mode: "pass", sort_order: 4, is_published: false });
  });

  it("defaults assignments to completion on submit and requires a title", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ActivityCreateModal open onClose={vi.fn()} courseId="c1" sectionId="s1" nextOrder={0} onCreated={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: /Assignment/ }));
    expect(screen.getByLabelText("Completion")).toHaveValue("submit");
    await user.click(screen.getByRole("button", { name: "Create & edit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Title is required.");
  });
});
