import {
  Alert,
  Anchor,
  Button,
  Card,
  Container,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { isDefinedError } from '@orpc/client';
import { useMutation } from '@tanstack/react-query';
import { signUpSchema } from '@app/contract';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { Link, useNavigate } from 'react-router';

import { orpc } from '../api/client';
import { useAuth } from '../auth/context';

/**
 * The rules this form enforces are `signUpSchema` — the same object the API
 * validates with. Not a copy of it: a password minimum changed in the contract
 * changes here, and the two can never disagree about what is valid.
 */
export function SignUpPage() {
  const { signedIn } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { email: '', displayName: '', password: '' },
    validate: zod4Resolver(signUpSchema),
  });

  const signUp = useMutation(
    orpc.auth.signUp.mutationOptions({
      onSuccess: (session) => {
        signedIn(session);
        void navigate('/');
      },
      onError: (error) => {
        /* The contract declares exactly one error here, so a *defined* error is
           the taken address — and it belongs on the email field, where the
           person can act on it, not in a banner at the top. */
        if (isDefinedError(error)) {
          form.setFieldError('email', 'That email address already has an account.');
        }
      },
    }),
  );

  return (
    <Container size={420} py="xl">
      <Stack gap="lg">
        <Title order={1} fz="h2">
          Create an account
        </Title>

        <Card withBorder radius="md" padding="lg">
          <form
            onSubmit={form.onSubmit((values) => {
              signUp.mutate(values);
            })}
          >
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="ada@example.com"
                /* Fake addresses are fine — nothing is ever sent. */
                {...form.getInputProps('email')}
                key={form.key('email')}
              />
              <TextInput
                label="Display name"
                placeholder="Ada"
                {...form.getInputProps('displayName')}
                key={form.key('displayName')}
              />
              <PasswordInput
                label="Password"
                description="At least 8 characters."
                {...form.getInputProps('password')}
                key={form.key('password')}
              />

              {/* An error that is not the declared one is the network or the
                  server, and there is no field to blame it on. */}
              {signUp.isError && !isDefinedError(signUp.error) ? (
                <Alert color="red" variant="light" title="Could not create the account">
                  {signUp.error.message}
                </Alert>
              ) : null}

              <Button type="submit" loading={signUp.isPending}>
                Create account
              </Button>

              <Anchor component={Link} to="/sign-in" size="sm" ta="center">
                Already have an account? Sign in
              </Anchor>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Container>
  );
}
