import type { Meta, StoryObj } from "@storybook/react-vite";
import BookGrid from "./BookGrid";

const meta: Meta<typeof BookGrid> = {
  component: BookGrid,
};
export default meta;

type Story = StoryObj<typeof BookGrid>;

export const Primary: Story = {
  args: {
    books: [
      {
        id: 1,
        title: "Title One",
        author: "Author One",
        genre: "Fantasy",
        readStatus: "Read",
        coverImageUrl: null,
      },
      {
        id: 2,
        title: "Title Two",
        author: "Author Two",
        genre: "Horror",
        readStatus: "Want to Read",
        coverImageUrl: null,
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    books: [],
  },
};
