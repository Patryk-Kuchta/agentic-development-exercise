import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TasksPage, type TasksPageProps } from './TasksPage';

function renderPage(props: TasksPageProps = {}) {
  return render(
    <MantineProvider env="test">
      <TasksPage {...props} />
    </MantineProvider>,
  );
}

describe('TasksPage', () => {
  it('renders the placeholder tasks when no tasks prop is given', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeDefined();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('rejects an empty title instead of calling onAddTask', async () => {
    const onAddTask = vi.fn<(title: string) => void>();
    const user = userEvent.setup();
    renderPage({ onAddTask });

    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAddTask).not.toHaveBeenCalled();
    expect(screen.getByText('A task needs a title')).toBeDefined();
  });

  it('passes a trimmed title to onAddTask', async () => {
    const onAddTask = vi.fn<(title: string) => void>();
    const user = userEvent.setup();
    renderPage({ onAddTask });

    await user.type(screen.getByLabelText('New task'), '  Buy milk  ');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAddTask).toHaveBeenCalledWith('Buy milk');
  });
});
