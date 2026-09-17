import { Alert, Anchor, Button, Container, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { orpc } from '../api/client';
import { useAuth } from '../auth/context';
import { ScoredMovieGrid } from '../components/ScoredMovieGrid';

/**
 * "Because you liked…" — the catalogue ranked against one vector built from
 * everything the signed-in user has favourited.
 */
export function SuggestionsPage() {
  const { user, isLoading } = useAuth();

  const suggestionsQuery = useQuery(
    orpc.suggestions.queryOptions({
      input: { limit: 12 },
      /* The endpoint needs a caller, so there is no point asking as nobody. */
      enabled: user !== undefined,
    }),
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>Suggestions</Title>
          <Text size="sm" c="dimmed">
            Films whose plots point in the same direction as the ones you favourited. The number is
            the cosine similarity: 1.00 is identical, 0.00 unrelated.
          </Text>
        </Stack>

        {isLoading || suggestionsQuery.isPending ? <Loader /> : null}

        {!isLoading && user === undefined ? (
          <Alert color="gray" variant="light" title="Sign in to get suggestions">
            <Stack gap="sm" align="flex-start">
              <Text size="sm">
                Suggestions are built from your favourites, so they need an account.
              </Text>
              <Button component={Link} to="/sign-in" variant="light">
                Sign in
              </Button>
            </Stack>
          </Alert>
        ) : null}

        {suggestionsQuery.isError ? (
          <Alert color="red" variant="light" title="Could not build your suggestions">
            <Text size="sm">{suggestionsQuery.error.message}</Text>
          </Alert>
        ) : null}

        {/* An empty result is not an empty grid: it means nothing has been
            favourited yet, and saying so is the difference between a working
            feature and a broken-looking one. */}
        {suggestionsQuery.isSuccess && suggestionsQuery.data.length === 0 ? (
          <Alert color="gray" variant="light" title="Favourite something first">
            <Stack gap="sm" align="flex-start">
              <Text size="sm">
                There is nothing to go on yet. Heart a few films and come back — three is plenty.
              </Text>
              <Anchor component={Link} to="/movies">
                Browse the catalogue
              </Anchor>
            </Stack>
          </Alert>
        ) : null}

        {suggestionsQuery.isSuccess && suggestionsQuery.data.length > 0 ? (
          <ScoredMovieGrid items={suggestionsQuery.data} />
        ) : null}
      </Stack>
    </Container>
  );
}
