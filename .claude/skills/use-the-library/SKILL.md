---
name: use-the-library
description: Find the library feature that already does the job before writing a helper. Use before writing any utility, formatter, form handler, fetch wrapper, validator, or state hook.
---

Before writing a helper, check this table. Most of what looks like glue is
already a prop.

| Need                                   | Use                                                      | Not                          |
| -------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| Text/number/select/checkbox input      | Mantine `TextInput`, `NumberInput`, `Select`, `Checkbox` | a wrapped `<input>`          |
| Table, sorting, empty state            | Mantine `Table`                                          | a hand-built `<table>`       |
| Modal, drawer, confirm dialog          | Mantine `Modal`, `Drawer`, `modals.openConfirmModal`     | custom overlay + portal      |
| Toast / error banner                   | `@mantine/notifications` `notifications.show`            | a bespoke toast context      |
| Date picking and formatting            | `@mantine/dates`                                         | hand-rolled date maths       |
| Dark mode, theming, spacing            | Mantine `useMantineColorScheme`, theme tokens            | custom CSS variables         |
| Layout, stacks, grids                  | Mantine `Stack`, `Group`, `Grid`, `Card`                 | bespoke flex CSS             |
| Form state, touched/dirty, validation  | `@mantine/form` `useForm` (+ `zodResolver`)              | `useState` per field         |
| Loading / error / empty states         | React Query `isPending`, `isError`, `error`              | manual loading booleans      |
| Refetch, cache, invalidate after write | React Query `invalidateQueries`, `staleTime`             | a refresh counter in state   |
| Optimistic update                      | React Query `onMutate` / `onError` rollback              | local mirror of server state |
| Calling the API                        | `@ts-rest/react-query` hooks from the contract           | `fetch` / axios              |
| Parsing unknown data, env, params      | Zod `.parse` / `.safeParse`                              | `as`, manual `typeof` checks |
| Enum-ish union                         | `z.enum([...])`                                          | TypeScript `enum` (banned)   |
| Querying, joins, inserts, transactions | Drizzle query builder / `db.transaction`                 | raw SQL strings              |
| Row types                              | `InferSelectModel` / contract types                      | hand-written interfaces      |

## Rule

A hand-rolled utility needs a justification you can say out loud: which library
API you checked, and why it doesn't fit. "I didn't look" is not one.

If the library does 90% of it, use it and take the 10% — not a custom thing that
does 100% and has to be maintained.

If you genuinely need something new, put it next to its only caller until a
second caller appears.
