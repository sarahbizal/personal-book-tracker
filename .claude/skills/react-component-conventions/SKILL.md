---
name: react-component-conventions
description: Props and structure conventions for React components in personal-book-tracker's client. Use whenever creating, editing, or reviewing a component under client/src/components or client/src/pages (e.g. adding a component, adding props, or composing a parent like SideBar or GenreList from child components). Not for *.stories.tsx files, main.tsx, or App wiring.
---

# React component conventions

Follow these rules for every component in `client/src/components` and `client/src/pages`. They don't apply to Storybook files (`*.stories.tsx`, which use `const meta` and `export const` stories), `main.tsx`, or App wiring. The reference implementations are `client/src/components/sidebar/GenreList.tsx` (parent) and `client/src/components/sidebar/GenreItem.tsx` (child). Read them when in doubt.

## Rules

1. **Local props interface.** Declare a `<ComponentName>Props` interface in the component's own file, directly above the component. Do not export it. Never import another component's `Props`.
2. **Plain types or shared domain types.** Each prop's type is either a plain type (`string`, `string[]`, `boolean`, `() => void`, `(item: string) => void`) or a shared domain type from `client/src/types/` (e.g. `Book`, `Book[]`). Do not derive prop types from another component's props (no `GenreListProps["items"]`, no `extends ChildProps`).
3. **Destructure in the signature.** `function Name({ a, b }: NameProps)`, not `props` with `props.a`.
4. **Pass props to children explicitly.** Write each prop by name (`<GenreItem name={item} isSelected={...} onClick={...} />`). Do not spread (`{...props}`).
5. **Parents name props for their own level.** A parent declares the props it needs in its own terms and maps them onto the child. For example, `GenreList` takes `items` and passes each one to `GenreItem` as `name`. A parent never imports a child's types.
6. **Function declaration and default export.** Use `function Name(...) { ... }` (not an arrow const), then a blank line, then `export default Name;` at the bottom of the file.
7. **Leave out empty interfaces.** A component with no props has no interface and an empty parameter list, and it still returns JSX. See `client/src/pages/BookDetailPage.tsx`:

   ```tsx
   function BookDetailPage() {
     return <div>Book Detail Page</div>;
   }
   ```

   Any component whose body is just `{}` (e.g. `function CurrentlyReading() {}`) is an empty placeholder. It returns nothing and can't be rendered as JSX, so don't copy it as a pattern. When you start one of them, make it return JSX first, even if that's just a placeholder `<div>`.

8. **Clickable elements are buttons.** Anything the user clicks to act on gets a `<button type="button">` (or a link for navigation), not `onClick` on an `<li>` or `<div>`, so it works with the keyboard. For a toggle or selection, add `aria-pressed`. See `GenreItem.tsx`, which wraps a `<button>` in its `<li>`. A button that submits a form is the exception: it uses `type="submit"` so clicking it and pressing Enter go through the same `onSubmit`. See `SearchBar.tsx`.

## Template

```tsx
import Child from "./Child";

interface ParentProps {
  things: string[];
  onSelectThing: (thing: string) => void;
}

function Parent({ things, onSelectThing }: ParentProps) {
  return (
    <div className="parent">
      {things.map((thing) => (
        <Child key={thing} name={thing} onClick={() => onSelectThing(thing)} />
      ))}
    </div>
  );
}

export default Parent;
```

## Composing a layout parent

A container such as `SideBar` that holds several children declares the union of what its children need, named for its own level, and passes each child its props explicitly:

```tsx
interface SideBarProps {
  genres: string[];
  onSelectGenre: (genre: string) => void;
}

function SideBar({ genres, onSelectGenre }: SideBarProps) {
  return (
    <aside className="sidebar">
      <GenreList items={genres} onSelectItem={onSelectGenre} />
    </aside>
  );
}

export default SideBar;
```

When you add a child that needs new data, add its fields to the parent's interface too, as plain types or shared domain types.

## Shared domain types

If several components (or page state, or API responses) need the same data shape, define it once in `client/src/types/<name>.ts` as an exported interface named after the domain object, not after a component. For example, `client/src/types/book.ts` exports `Book`.

- Parents and pages use the domain type: `BookGrid` takes `books: Book[]`, and `BooksMainPage` holds `useState<Book[]>`.
- Import it with a type-only relative import: `import type { Book } from "../../types/book";` from `components/<dir>/`, or `"../types/book"` from `pages/`.
- A leaf component can keep **flat props** written as plain types even when they match a domain type. `BookCard` declares `id`, `title`, `author`, etc. itself, and `BookGrid` passes each field explicitly. TypeScript checks that every prop `BookCard` declares is passed with a matching type. It does **not** catch a new `Book` field that `BookCard` doesn't declare, so when you add a field to `Book`, also update `BookCard` and `BookGrid` if the card should show it. Don't write `interface BookCardProps extends Book {}`, because the repo's typescript-eslint `no-empty-object-type` rule rejects empty interfaces.
- Never use a component's `Props` as a data model.

## Lists

Every element rendered from `.map` gets a stable `key`. Use the domain id (`key={book.id}`), or the value itself for unique strings (`key={item}`). Never use the array index.
