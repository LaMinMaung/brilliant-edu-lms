import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/** Renders inside a router; `path` lets a test assert navigation by rendering a marker at the destination. */
export function renderWithRouter(ui: ReactElement, { route = "/", path = "*" }: { route?: string; path?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={ui} />
        <Route path="/learn/courses/:id/announcements" element={<p>announcements-page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

export const testUser = { id: "u1", name: "Tess Teacher", email: "tess@example.com", collectionId: "users", avatar: "" };
