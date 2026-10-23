import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../test/utils";
import type { Activity } from "../../lib/types";

vi.mock("../../lib/pocketbase", async () => ({ default: (await import("../../test/pbMock")).makePbMock() }));
vi.mock("../../hooks/useToast", () => ({ useToast: () => vi.fn() }));
vi.mock("../editor/RichTextEditor", () => ({ RichTextEditor: ({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) => <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} /> }));
vi.mock("../../services/curriculum", () => ({ updateActivity: vi.fn().mockImplementation((_id, data) => Promise.resolve({ id: "a1", type: "quiz", ...data })) }));

import { updateActivity } from "../../services/curriculum";
import { ActivityBasicsForm } from "./ActivityBasicsForm";

const activity = { id: "a1", type: "quiz", title: "Quiz 1", description: "", content: "", completion_mode: "pass", is_published: false } as unknown as Activity;

describe("ActivityBasicsForm", () => {
  it("offers type-specific completion options and saves details", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderWithRouter(<ActivityBasicsForm activity={activity} instructionsLabel="Instructions" onSaved={onSaved} />);
    const completion = screen.getByLabelText("Completion");
    expect(Array.from((completion as HTMLSelectElement).options).map((o) => o.value)).toEqual(["pass", "submit", "none"]);
    await user.selectOptions(completion, "submit");
    await user.click(screen.getByRole("switch", { name: /Published/ }));
    await user.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(updateActivity).toHaveBeenCalledWith("a1", { title: "Quiz 1", description: "", content: "", completion_mode: "submit", is_published: true });
  });

  it("requires a title", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ActivityBasicsForm activity={activity} instructionsLabel="Instructions" onSaved={vi.fn()} />);
    await user.clear(screen.getByLabelText(/Title/));
    await user.click(screen.getByRole("button", { name: "Save details" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Title is required.");
  });
});
