import type { Meta, StoryObj } from "@storybook/react-vite";
import primaryBookCover from "../../assets/primary-book-cover.jpg";
import BookCard from "./BookCard";

const meta: Meta<typeof BookCard> = {
  component: BookCard,
  args: {
    id: 1,
    title: "Title",
    author: "Author",
    genre: "Genre",
    readStatus: "Read Status",
  },
};
export default meta;

type Story = StoryObj<typeof BookCard>;

export const Primary: Story = {
  args: {
    coverImageUrl: primaryBookCover,
  },
};

export const NoCoverImage: Story = {
  args: {
    coverImageUrl: null,
  },
};

export const InvalidCoverUrl: Story = {
  args: {
    coverImageUrl: "image",
  },
};
