import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PasswordField } from "@/components/auth/password-field";

describe("PasswordField", () => {
  afterEach(() => {
    cleanup();
  });

  it("defaults to aria-invalid=false when isInvalid is not passed", () => {
    render(
      <PasswordField
        id="password"
        label="Password"
        name="password"
        autoComplete="current-password"
        value=""
        onChange={() => {}}
      />,
    );

    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  // aria-invalid has no "absent means valid" convention the way
  // aria-describedby's undefined-when-clean pattern does - it must
  // always render an explicit "true"/"false", never be omitted, so
  // this asserts the attribute is present (not just falsy) in both
  // states, per this component's own comment.
  it("sets aria-invalid=true when isInvalid is true", () => {
    render(
      <PasswordField
        id="password"
        label="Password"
        name="password"
        autoComplete="current-password"
        value=""
        onChange={() => {}}
        isInvalid
      />,
    );

    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("toggles the reveal button and updates the input type", () => {
    render(
      <PasswordField
        id="password"
        label="Password"
        name="password"
        autoComplete="current-password"
        value="secret"
        onChange={() => {}}
      />,
    );

    const input = screen.getByLabelText("Password", { exact: true });
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
