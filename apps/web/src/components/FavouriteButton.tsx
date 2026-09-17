import { ActionIcon, Tooltip } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { orpc } from '../api/client';
import { useAuth } from '../auth/context';

/**
 * The heart. Everything it needs is already on the summary the list sends, so
 * it works on a card and on the detail page without either fetching more.
 *
 * `♥` and `♡` rather than an icon package: two characters, no dependency, and
 * the difference is obvious at a glance.
 */
interface FavouriteButtonProps {
  movieId: number;
  title: string;
  isFavourite: boolean;
}

export function FavouriteButton({ movieId, title, isFavourite }: FavouriteButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* After a toggle every list that might mention this film is stale — the
     movie list, the favourites page, and the film's own detail. Invalidating
     is what makes them agree; a `useState` mirror of the heart would not. */
  const refetchMovies = async () => {
    await queryClient.invalidateQueries({ queryKey: orpc.movies.key() });
  };

  const add = useMutation(orpc.favourites.add.mutationOptions({ onSuccess: refetchMovies }));
  const remove = useMutation(orpc.favourites.remove.mutationOptions({ onSuccess: refetchMovies }));

  /* A signed-out visitor still sees the heart, because hiding it hides the
     feature. Pressing it asks them to sign in rather than failing at them. */
  if (user === undefined) {
    return (
      <Tooltip label="Sign in to save favourites" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size={36}
          aria-label={`Sign in to favourite ${title}`}
          onClick={(event) => {
            /* The card is a link; without this the click both opens the film
               and bounces to sign-in. */
            event.preventDefault();
            void navigate('/sign-in');
          }}
        >
          ♡
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <ActionIcon
      variant="subtle"
      color={isFavourite ? 'red' : 'gray'}
      size={36}
      loading={add.isPending || remove.isPending}
      aria-label={isFavourite ? `Remove ${title} from favourites` : `Add ${title} to favourites`}
      onClick={(event) => {
        event.preventDefault();

        if (isFavourite) {
          remove.mutate({ movieId });
        } else {
          add.mutate({ movieId });
        }
      }}
    >
      {isFavourite ? '♥' : '♡'}
    </ActionIcon>
  );
}
