import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import SideBar from "./SideBar";

const meta: Meta<typeof SideBar> = {
  component: SideBar,
  args: {
    genres: ["Fantasy", "Horror", "Mystery"],
    selectedGenre: null,
    onSelectGenre: fn(),
  },
  // SideBar is controlled, so the story holds the selected genre the way BooksMainPage does.
  // useState instead of Storybook's useArgs because the test runner doesn't re-render on
  // updateArgs. The trade-off is that changing selectedGenre in the Controls panel does nothing.
  render: function Render(args) {
    const [selectedGenre, setSelectedGenre] = useState(args.selectedGenre);

    return (
      <SideBar
        {...args}
        selectedGenre={selectedGenre}
        onSelectGenre={(genre) => {
          setSelectedGenre(genre);
          args.onSelectGenre(genre);
        }}
      />
    );
  },
};
export default meta;

type Story = StoryObj<typeof SideBar>;

export const Primary: Story = {};

export const GenreSelected: Story = {
  args: {
    selectedGenre: "Horror",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("button", { name: "Horror" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      canvas.getByRole("button", { name: "All genres" }),
    ).toHaveAttribute("aria-pressed", "false");
  },
};

// "All genres" still shows when there are no genres yet.
export const Empty: Story = {
  args: {
    genres: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("heading", { name: "Genres" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "All genres" }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};

export const SelectGenre: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const fantasy = canvas.getByRole("button", { name: "Fantasy" });

    await userEvent.click(fantasy);

    await expect(args.onSelectGenre).toHaveBeenCalledTimes(1);
    await expect(args.onSelectGenre).toHaveBeenCalledWith("Fantasy");
    await expect(fantasy).toHaveAttribute("aria-pressed", "true");
    await expect(
      canvas.getByRole("button", { name: "All genres" }),
    ).toHaveAttribute("aria-pressed", "false");
  },
};

export const ClickSelectedGenreAgain: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const fantasy = canvas.getByRole("button", { name: "Fantasy" });

    await userEvent.click(fantasy);
    await userEvent.click(fantasy);

    await expect(args.onSelectGenre).toHaveBeenCalledTimes(2);
    await expect(args.onSelectGenre).toHaveBeenNthCalledWith(1, "Fantasy");
    await expect(args.onSelectGenre).toHaveBeenNthCalledWith(2, null);
    await expect(fantasy).toHaveAttribute("aria-pressed", "false");
    await expect(
      canvas.getByRole("button", { name: "All genres" }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};

export const ClickAllGenres: Story = {
  args: {
    selectedGenre: "Horror",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "All genres" }));

    await expect(args.onSelectGenre).toHaveBeenCalledTimes(1);
    await expect(args.onSelectGenre).toHaveBeenCalledWith(null);
    await expect(
      canvas.getByRole("button", { name: "Horror" }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(
      canvas.getByRole("button", { name: "All genres" }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};
