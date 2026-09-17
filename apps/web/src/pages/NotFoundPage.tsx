import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="sm" align="flex-start">
        <Title order={1}>404</Title>
        <Text c="dimmed">There is nothing at this address.</Text>
        <Anchor component={Link} to="/">
          Back to the home page
        </Anchor>
      </Stack>
    </Container>
  );
}
