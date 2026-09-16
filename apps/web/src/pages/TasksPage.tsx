import {
  ActionIcon,
  Button,
  Checkbox,
  CloseIcon,
  Container,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';

/** Row shape rendered by this page. Replace with the contract type when the API client lands. */
export interface Task {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
  readonly createdAt: string;
}

export interface TasksPageProps {
  readonly tasks?: readonly Task[];
  readonly onAddTask?: (title: string) => void;
  readonly onToggleTask?: (id: number, done: boolean) => void;
  readonly onDeleteTask?: (id: number) => void;
}

/* PLACEHOLDER DATA — hardcoded so the shell renders without a network call.
   Delete this array (and the `tasks` default below) when the API client lands
   and the real task list is passed in as a prop. */
const placeholderTasks: readonly Task[] = [
  { id: 1, title: 'Wire the API client', done: false, createdAt: '2026-09-14T09:00:00.000Z' },
  { id: 2, title: 'Add a task from this form', done: false, createdAt: '2026-09-15T11:30:00.000Z' },
  { id: 3, title: 'Read the contract package', done: true, createdAt: '2026-09-16T08:15:00.000Z' },
];

/* zod 4 schema for the add-task input. `zod4Resolver` is the zod-4 entry point of
   mantine-form-zod-resolver; the plain `zodResolver` still reads `error.errors`,
   which only exists on zod 3. */
const addTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'A task needs a title')
    .max(200, 'A title cannot be longer than 200 characters'),
});

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export function TasksPage({
  tasks = placeholderTasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: TasksPageProps) {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { title: '' },
    validate: zod4Resolver(addTaskSchema),
  });

  const handleSubmit = form.onSubmit((values) => {
    onAddTask?.(values.title.trim());
    form.reset();
  });

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>Tasks</Title>

        <form onSubmit={handleSubmit}>
          <Group align="flex-start" gap="sm" wrap="nowrap">
            <TextInput
              flex={1}
              label="New task"
              placeholder="What needs doing?"
              key={form.key('title')}
              {...form.getInputProps('title')}
            />
            <Button type="submit" mt="xl">
              Add
            </Button>
          </Group>
        </form>

        {tasks.length === 0 ? (
          <Text c="dimmed">Nothing to do yet.</Text>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={48}>Done</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th w={140}>Created</Table.Th>
                <Table.Th w={48} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tasks.map((task) => (
                <Table.Tr key={task.id}>
                  <Table.Td>
                    <Checkbox
                      checked={task.done}
                      aria-label={`Mark "${task.title}" as done`}
                      onChange={(event) => {
                        onToggleTask?.(task.id, event.currentTarget.checked);
                      }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text
                      td={task.done ? 'line-through' : 'none'}
                      c={task.done ? 'dimmed' : 'inherit'}
                    >
                      {task.title}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {dateFormatter.format(new Date(task.createdAt))}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Delete "${task.title}"`}
                      onClick={() => {
                        onDeleteTask?.(task.id);
                      }}
                    >
                      <CloseIcon size="14" />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Container>
  );
}
