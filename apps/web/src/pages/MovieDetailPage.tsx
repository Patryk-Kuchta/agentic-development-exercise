import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { isDefinedError } from '@orpc/client';
import { skipToken, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { z } from 'zod';

import { orpc, type ApiOutputs } from '../api/client';
import { MoviePoster } from '../components/MoviePoster';
import { formatCount, formatRating, formatRuntime } from '../format';

type Movie = ApiOutputs['movies']['get'];

/**
 * Path parameters are strings and anyone can type one. The contract coerces the
 * id too, but parsing here means `/movies/banana` renders "we do not have that
 * film" instead of firing a request that cannot possibly succeed.
 */
const movieIdSchema = z.coerce.number().int().positive();

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.5}>
        {label}
      </Text>
      <Text fz={24} fw={700} lh={1.2}>
        {value}
      </Text>
    </Stack>
  );
}

/** A row of the facts table. An empty list is stated, not left blank. */
function FactRow({ label, values }: { label: string; values: string[] }) {
  return (
    <Table.Tr>
      <Table.Th w={140}>{label}</Table.Th>
      <Table.Td>
        {values.length > 0 ? (
          values.join(', ')
        ) : (
          <Text size="sm" c="dimmed" fs="italic" component="span">
            Not recorded
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

function AwardsRow({ movie }: { movie: Movie }) {
  /* The dataset writes the awards out in prose ("Won 2 Oscars. Another 7 wins…")
     and also gives the counts. The prose is better when it exists. */
  const summary =
    movie.awardsText ??
    `${formatCount(movie.awardsWins)} wins, ${formatCount(movie.awardsNominations)} nominations`;

  return (
    <Table.Tr>
      <Table.Th>Awards</Table.Th>
      <Table.Td>{summary}</Table.Td>
    </Table.Tr>
  );
}

function MovieDetail({ movie }: { movie: Movie }) {
  /* `fullplot` is the long one and is missing for 48 films; `plot` is the
     one-liner. Neither is guaranteed, so the absence has its own wording. */
  const plot = movie.fullplot ?? movie.plot;

  return (
    <Grid gap="xl">
      <Grid.Col span={{ base: 12, sm: 5, md: 4 }}>
        <Card withBorder radius="md" padding={0}>
          <MoviePoster poster={movie.poster} title={movie.title} height={460} />
        </Card>
      </Grid.Col>

      <Grid.Col span={{ base: 12, sm: 7, md: 8 }}>
        <Stack gap="lg">
          <Stack gap="sm">
            <Title order={1}>{movie.title}</Title>
            <Group gap="xs">
              <Badge variant="filled" tt="capitalize">
                {movie.type}
              </Badge>
              {movie.rated === null ? null : <Badge variant="default">{movie.rated}</Badge>}
              {movie.runtime === null ? null : (
                <Badge variant="default">{formatRuntime(movie.runtime)}</Badge>
              )}
              {movie.genres.map((genre) => (
                <Badge key={genre} variant="light">
                  {genre}
                </Badge>
              ))}
            </Group>
          </Stack>

          <Card withBorder radius="md" padding="md">
            <Group gap={48}>
              <Stat
                label="IMDb rating"
                value={movie.imdbRating === null ? '—' : formatRating(movie.imdbRating)}
              />
              <Stat
                label="Votes"
                value={movie.imdbVotes === null ? '—' : formatCount(movie.imdbVotes)}
              />
              <Stat
                label="Metacritic"
                value={movie.metacritic === null ? '—' : String(movie.metacritic)}
              />
            </Group>
          </Card>

          {plot === null ? (
            <Text c="dimmed" fs="italic">
              No plot on file for this film.
            </Text>
          ) : (
            <Text>{plot}</Text>
          )}

          <Table variant="vertical" withTableBorder layout="fixed">
            <Table.Tbody>
              <FactRow label="Cast" values={movie.castMembers} />
              <FactRow label="Directors" values={movie.directors} />
              <FactRow label="Writers" values={movie.writers} />
              <FactRow label="Countries" values={movie.countries} />
              <FactRow label="Languages" values={movie.languages} />
              <AwardsRow movie={movie} />
            </Table.Tbody>
          </Table>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

function UnknownMovie() {
  return (
    <Alert color="gray" variant="light" title="We do not have that film">
      <Stack gap="sm" align="flex-start">
        <Text size="sm">
          There is no movie with that id in the catalogue. It may have been removed, or the link may
          have been mistyped.
        </Text>
        <Button component={Link} to="/movies" variant="light">
          Browse the catalogue
        </Button>
      </Stack>
    </Alert>
  );
}

export function MovieDetailPage() {
  const { id } = useParams();

  const parsedId = movieIdSchema.safeParse(id);

  const movieQuery = useQuery(
    orpc.movies.get.queryOptions({
      /* `skipToken` rather than `enabled: false`: it also tells TypeScript there
         is no input, so an unparseable id cannot reach the client at all. */
      input: parsedId.success ? { id: parsedId.data } : skipToken,
    }),
  );

  /* `movies.get` declares exactly one error in the contract — NOT_FOUND — so a
     *defined* error is a missing film, and anything else is the network or the
     server falling over. The two deserve different screens. */
  const isUnknownMovie =
    !parsedId.success || (movieQuery.isError && isDefinedError(movieQuery.error));

  return (
    <Stack gap="lg" p="xl" maw={1200} mx="auto" w="100%">
      <Anchor component={Link} to="/movies" size="sm">
        ← Back to the list
      </Anchor>

      {isUnknownMovie ? <UnknownMovie /> : null}

      {!isUnknownMovie && movieQuery.isPending ? <Loader /> : null}

      {!isUnknownMovie && movieQuery.isError ? (
        <Alert color="red" variant="light" title="Could not load this film">
          <Text size="sm">{movieQuery.error.message}</Text>
        </Alert>
      ) : null}

      {movieQuery.isSuccess ? <MovieDetail movie={movieQuery.data} /> : null}
    </Stack>
  );
}
