import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import SearchBar from "./SearchBar";

const meta: Meta<typeof SearchBar> = {
  component: SearchBar,
  args: {
    onSearch: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof SearchBar>;

export const Primary: Story = {};

export const SubmitSearch: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Search books by title" });

    await userEvent.type(input, "Moby Dick{enter}");

    await expect(args.onSearch).toHaveBeenCalledTimes(1);
    await expect(args.onSearch).toHaveBeenCalledWith("Moby Dick");
  },
};

// An empty search is passed through as-is; the server returns all books for an empty title.
export const EmptySubmit: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Search books by title" });

    await userEvent.type(input, "{enter}");

    await expect(args.onSearch).toHaveBeenCalledTimes(1);
    await expect(args.onSearch).toHaveBeenCalledWith("");
  },
};
