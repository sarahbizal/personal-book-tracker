import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import Header from "./Header";

const meta: Meta<typeof Header> = {
  component: Header,
  args: {
    onSearch: fn(),
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
    const input = canvas.getByRole("textbox", { name: "Search books by title" });

    await userEvent.type(input, "Moby Dick{enter}");

    await expect(args.onSearch).toHaveBeenCalledTimes(1);
    await expect(args.onSearch).toHaveBeenCalledWith("Moby Dick");
  },
};
