import type { Meta, StoryObj } from "@storybook/react-vite";
import BookGrid from "./BookGrid";

const meta: Meta<typeof BookGrid> = {
  component: BookGrid,
};
export default meta;

type Story = StoryObj<typeof BookGrid>;

export const Primary: Story = {
  args: {},
};
