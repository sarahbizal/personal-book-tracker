import type { Meta, StoryObj } from "@storybook/react-vite";
import BookCard from "./BookCard";

const meta: Meta<typeof BookCard> = {
  component: BookCard,
};
export default meta;

type Story = StoryObj<typeof BookCard>;

export const Primary: Story = {
  args: {
    id: 1,
    title: "Title",
    author: "Author",
    genre: "Genre",
    readStatus: "Read Status",
    coverImageUrl:
      "https://en.wikipedia.org/wiki/File:Moby-Dick_FE_title_page.jpg",
  },
};

export const NoCoverImage: Story = {
  args: {
    id: 1,
    title: "Title",
    author: "Author",
    genre: "Genre",
    readStatus: "Read Status",
    coverImageUrl: null,
  },
};

export const InvalidCoverUrl: Story = {
  args: {
    id: 1,
    title: "Title",
    author: "Author",
    genre: "Genre",
    readStatus: "Read Status",
    coverImageUrl: "image",
  },
};
