import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";
import { expect, fn, userEvent, within } from "storybook/test";
import Header from "./Header";

const meta: Meta<typeof Header> = {
  component: Header,
  //The Log in link needs a router
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    onSearch: fn(),
    isAdmin: false,
    onLogout: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof Header>;

export const Primary: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("heading", { level: 1, name: "Sarah's Reading Nook" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Open menu" }),
    ).toBeInTheDocument();
  },
};

export const SubmitSearch: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", {
      name: "Search books by title",
    });

    await userEvent.type(input, "Moby Dick{enter}");

    await expect(args.onSearch).toHaveBeenCalledTimes(1);
    await expect(args.onSearch).toHaveBeenCalledWith("Moby Dick");
  },
};

export const Viewer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
    await expect(
      canvas.queryByRole("button", { name: "Log out" }),
    ).not.toBeInTheDocument();
  },
};

export const Admin: Story = {
  args: { isAdmin: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.queryByRole("link", { name: "Log in" }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Log out" }));
    await expect(args.onLogout).toHaveBeenCalledTimes(1);
  },
};

export const CheckingLogin: Story = {
  args: { isAdmin: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.queryByRole("link", { name: "Log in" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Log out" }),
    ).not.toBeInTheDocument();
  },
};
