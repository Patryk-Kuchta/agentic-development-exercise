import { Badge, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { Link } from 'react-router';

import type { ApiOutputs } from '../api/client';
import { MoviePoster } from './MoviePoster';

/* Both pages render the same card, so the shape is read off the endpoint that
   produces the richer of the two rather than restated here. `/suggestions`
   carries the favourite that pulled a film in; `/movies/{id}/similar` has no
   such thing to carry, which is the whole of the difference. */
type Suggestion = ApiOutputs['suggestions'][number];

interface ScoredMovie {
  movie: Suggestion['movie'];
  score: Suggestion['score'];
  because?: Suggestion['because'];
}

/**
 * A grid of films with their similarity scores.
 *
 * The score is shown, not hidden: design constraint aside, a recommendation you
 * cannot interrogate is indistinguishable from a guess, and seeing 0.82 next to
 * a film is what lets someone judge whether the thing works.
 */
export function ScoredMovieGrid({ items }: { items: readonly ScoredMovie[] }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 6 }} spacing="md">
      {items.map(({ movie, score, because }) => (
        <Card
          key={movie.id}
          withBorder
          radius="md"
          padding="sm"
          h="100%"
          component={Link}
          to={`/movies/${String(movie.id)}`}
        >
          <Card.Section>
            <MoviePoster poster={movie.poster} title={movie.title} height={180} />
          </Card.Section>

          <Stack gap={4} mt="sm">
            <Text size="sm" fw={600} lh={1.3} lineClamp={2}>
              {movie.title}
            </Text>

            <Group gap={6}>
              {/* Two decimals: the difference between 0.82 and 0.79 is the
                  whole point, and more digits would imply precision the
                  embedding does not have. */}
              <Badge variant="light" size="sm">
                {score.toFixed(2)}
              </Badge>
            </Group>

            {because === undefined ? null : (
              <Text size="xs" c="dimmed" lineClamp={2}>
                Because you liked {because.title}
              </Text>
            )}
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}
