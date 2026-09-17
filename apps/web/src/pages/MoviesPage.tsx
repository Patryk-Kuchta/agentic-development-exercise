import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { movieSortSchema } from '@app/contract';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';

import { orpc, type ApiOutputs } from '../api/client';
import { useAuth } from '../auth/context';
import { FavouriteButton } from '../components/FavouriteButton';
import { MoviePoster } from '../components/MoviePoster';
import { formatRating, formatRuntime } from '../format';

/** One page of cards. Four across on a wide screen, so six rows fill it. */
const PAGE_SIZE = 24;

/* The card only ever renders the summary the list endpoint sends, and that shape
   is read off the contract rather than restated here. Drop a column from
   `movieSummarySchema` and this file stops compiling, which is the point. */
type MovieSummary = ApiOutputs['movies']['list']['items'][number];

/* Labels for the contract's sort union. The values come from the contract, so a
   new sort order added upstream is a type error here rather than a dead option. */
const sortOptions = [
  { value: 'rating', label: 'Highest IMDb rating' },
  { value: 'title', label: 'Title A–Z' },
] satisfies { value: z.infer<typeof movieSortSchema>; label: string }[];

/**
 * The query string is user input like any other, so it is parsed, not read.
 *
 * `.catch` rather than a throw is deliberate and local: a hand-edited
 * `?page=banana` should show page 1, not an error page, because the address bar
 * is right there and the user can see what they typed. Nothing downstream of
 * here gets a default.
 */
const filtersSchema = z.object({
  /* Deliberately not `.trim()`: the box is controlled by this value, so trimming
     here would eat the space the moment it is typed and make "star wars"
     unspellable. The trim belongs on the way out, not on the way in. */
  q: z.string().max(100).catch(''),
  genre: z.string().max(50).catch(''),
  sort: movieSortSchema.catch('rating'),
  page: z.coerce.number().int().min(1).catch(1),
});

/**
 * Applying a filter always returns to page 1. Without this, narrowing a 40-page
 * result while sitting on page 7 lands the user on an empty page 7 of 2 and
 * looks like the filter is broken.
 */
function withFilter(params: URLSearchParams, key: string, value: string): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('page');

  if (value === '') {
    next.delete(key);
  } else {
    next.set(key, value);
  }

  return next;
}

function withPage(params: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(params);

  /* Page 1 is the default, so it stays out of the URL: `/movies` and
     `/movies?page=1` should not be two different-looking links to one page. */
  if (page === 1) {
    next.delete('page');
  } else {
    next.set('page', String(page));
  }

  return next;
}

function RatingBadge({ rating }: { rating: number | null }) {
  if (rating === null) {
    return (
      <Badge variant="default" size="sm">
        Unrated
      </Badge>
    );
  }

  return (
    <Badge variant="light" color="yellow" size="sm">
      IMDb {formatRating(rating)}
    </Badge>
  );
}

function MovieCard({ movie }: { movie: MovieSummary }) {
  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      h="100%"
      component={Link}
      to={`/movies/${String(movie.id)}`}
    >
      <Card.Section>
        <MoviePoster poster={movie.poster} title={movie.title} height={280} />
      </Card.Section>

      <Stack gap="xs" mt="md" flex={1}>
        <Text fw={600} lh={1.3} lineClamp={2}>
          {movie.title}
        </Text>

        {movie.genres.length > 0 ? (
          <Group gap={6}>
            {movie.genres.map((genre) => (
              <Badge key={genre} variant="light" size="sm">
                {genre}
              </Badge>
            ))}
          </Group>
        ) : (
          <Text size="xs" c="dimmed">
            No genres listed
          </Text>
        )}

        {movie.plot === null ? (
          <Text size="sm" c="dimmed" fs="italic">
            No plot on file.
          </Text>
        ) : (
          <Text size="sm" c="dimmed" lineClamp={3}>
            {movie.plot}
          </Text>
        )}

        <Group gap="xs" justify="space-between" mt="auto">
          <RatingBadge rating={movie.imdbRating} />
          <Group gap={4}>
            <Text size="xs" c="dimmed">
              {movie.runtime === null ? 'Runtime unknown' : formatRuntime(movie.runtime)}
            </Text>
            <FavouriteButton
              movieId={movie.id}
              title={movie.title}
              isFavourite={movie.isFavourite}
            />
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}

/**
 * Three different nothings. The favourites page is this component with the
 * filter pinned on, so an empty result there means "you have favourited
 * nothing", not "narrow your search" — and telling a learner to change a
 * search they never typed reads as a bug.
 */
function NoMatches({
  favouritesOnly,
  hasFilters,
}: {
  favouritesOnly: boolean;
  hasFilters: boolean;
}) {
  if (favouritesOnly && !hasFilters) {
    return (
      <Alert color="gray" variant="light" title="No favourites yet">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">Films you favourite show up here.</Text>
          <Button component={Link} to="/movies" variant="light">
            Browse the movies
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (favouritesOnly) {
    return (
      <Alert color="gray" variant="light" title="No favourites match those filters">
        <Text size="sm">
          You have favourited something, but nothing that matches this search and genre.
        </Text>
      </Alert>
    );
  }

  return (
    <Alert color="gray" variant="light" title="No films match those filters">
      <Text size="sm">
        Nothing in the catalogue matches this search and genre together. Try one or the other.
      </Text>
    </Alert>
  );
}

/**
 * One component per outcome keeps the page body a flat list of React Query
 * states rather than a nest of ternaries.
 */
function MovieResults({
  result,
  favouritesOnly,
  hasFilters,
}: {
  result: ApiOutputs['movies']['list'];
  favouritesOnly: boolean;
  hasFilters: boolean;
}) {
  if (result.items.length === 0) {
    return <NoMatches favouritesOnly={favouritesOnly} hasFilters={hasFilters} />;
  }

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="lg">
      {result.items.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </SimpleGrid>
  );
}

/**
 * `favouritesOnly` pins the filter on for the favourites page, which is
 * otherwise this exact component — see `FavouritesPage.tsx`. The toggle below
 * is therefore only offered on the open list.
 */
export function MoviesPage({ favouritesOnly = false }: { favouritesOnly?: boolean }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  /* /favourites is linkable, so a signed-out visitor can land on it. Falling
     through would drop the filter and list the whole catalogue under the
     heading "Your favourites", which is worse than saying nothing. */
  const signedOutOnFavourites = favouritesOnly && user === undefined;

  const filters = filtersSchema.parse({
    q: searchParams.get('q') ?? '',
    genre: searchParams.get('genre') ?? '',
    sort: searchParams.get('sort') ?? 'rating',
    page: searchParams.get('page') ?? '1',
  });

  /* The contract rejects a blank search, and " " is a blank search. */
  const search = filters.q.trim();

  /* Pinned on the favourites page, otherwise driven by the toggle in the URL.
     A signed-out visitor has no favourites to filter to, so it stays off. */
  const showFavouritesOnly =
    user !== undefined && (favouritesOnly || searchParams.get('favourites') === 'true');

  const listQuery = useQuery(
    orpc.movies.list.queryOptions({
      input: {
        page: filters.page,
        pageSize: PAGE_SIZE,
        sort: filters.sort,
        /* Spread rather than `search: undefined`: `exactOptionalPropertyTypes`
           distinguishes "absent" from "present and undefined", and the contract
           means absent. */
        ...(search === '' ? {} : { search }),
        ...(filters.genre === '' ? {} : { genre: filters.genre }),
        /* The contract takes the word, not a boolean: a query string has no
           booleans, and `z.coerce.boolean()` would read "false" as true. */
        ...(showFavouritesOnly ? { favouritesOnly: 'true' } : {}),
      },
    }),
  );

  /* The genre list only changes when the database is re-ingested, so it is
     fetched once and then left alone for the lifetime of the tab. */
  const genresQuery = useQuery(orpc.movies.genres.queryOptions({ staleTime: Infinity }));

  /* Typing replaces the current history entry — one entry per keystroke would
     make the back button useless. Picking a genre, a sort or a page is a real
     navigation, so those push. */
  const setSearch = (value: string) => {
    setSearchParams(withFilter(searchParams, 'q', value), { replace: true });
  };
  const setGenre = (value: string | null) => {
    setSearchParams(withFilter(searchParams, 'genre', value ?? ''));
  };
  const setSort = (value: string | null) => {
    setSearchParams(withFilter(searchParams, 'sort', value ?? 'rating'));
  };
  const setPage = (value: number) => {
    setSearchParams(withPage(searchParams, value));
  };

  if (signedOutOnFavourites) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="lg">
          <Title order={1}>Your favourites</Title>
          <Alert color="gray" variant="light" title="Sign in to see your favourites">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">Favourites belong to an account.</Text>
              <Button component={Link} to="/sign-in" variant="light">
                Sign in
              </Button>
            </Stack>
          </Alert>
        </Stack>
      </Container>
    );
  }
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Anchor component={Link} to="/" size="sm">
            ← Movie Suggester
          </Anchor>
          <Group justify="space-between" align="baseline">
            <Title order={1}>{favouritesOnly ? 'Your favourites' : 'Movies'}</Title>
            {listQuery.isSuccess && listQuery.data.total > 0 ? (
              <Text size="sm" c="dimmed">
                Page {listQuery.data.page} of {listQuery.data.totalPages} · {listQuery.data.total}{' '}
                films
              </Text>
            ) : null}
          </Group>
        </Stack>

        <Card withBorder radius="md" padding="md">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <TextInput
              label="Search"
              placeholder="alien, godfather, kurosawa…"
              /* The contract caps `search` at 100 characters; stopping the 101st
                 at the keyboard beats letting the URL parser discard the lot. */
              maxLength={100}
              value={filters.q}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
              }}
            />
            <Select
              label="Genre"
              size="md"
              /* Clearable with a placeholder rather than an "All genres" option:
                 Mantine models "no selection" as `null`, and inventing an
                 empty-string option to mean the same thing would give the state
                 two spellings. */
              placeholder="All genres"
              clearable
              searchable
              nothingFoundMessage="No such genre"
              data={genresQuery.data ?? []}
              value={filters.genre === '' ? null : filters.genre}
              onChange={setGenre}
            />
            <Select
              label="Sort by"
              size="md"
              allowDeselect={false}
              data={sortOptions}
              value={filters.sort}
              onChange={setSort}
            />
          </SimpleGrid>

          {/* Only on the open list, and only to somebody who can have
              favourites — on the favourites page the filter is the page. */}
          {!favouritesOnly && user !== undefined ? (
            <Switch
              mt="sm"
              label="Favourites only"
              checked={showFavouritesOnly}
              onChange={(event) => {
                setSearchParams(
                  withFilter(searchParams, 'favourites', event.currentTarget.checked ? 'true' : ''),
                );
              }}
            />
          ) : null}
        </Card>

        {listQuery.isPending ? <Loader /> : null}

        {listQuery.isError ? (
          <Alert color="red" variant="light" title="Could not load the movies">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">{listQuery.error.message}</Text>
              <Button
                variant="light"
                onClick={() => {
                  void listQuery.refetch();
                }}
              >
                Try again
              </Button>
            </Stack>
          </Alert>
        ) : null}

        {listQuery.isSuccess ? (
          <MovieResults
            result={listQuery.data}
            favouritesOnly={favouritesOnly || showFavouritesOnly}
            hasFilters={search !== '' || filters.genre !== ''}
          />
        ) : null}

        {listQuery.isSuccess && listQuery.data.totalPages > 1 ? (
          <Group justify="center">
            {/* Driven by the URL, not by the response: while `placeholderData`
                holds the old page on screen the pager must already show the page
                being navigated to, or clicking "3" visibly bounces back to 2. */}
            <Pagination
              total={listQuery.data.totalPages}
              value={filters.page}
              onChange={setPage}
              withEdges
            />
          </Group>
        ) : null}
      </Stack>
    </Container>
  );
}
