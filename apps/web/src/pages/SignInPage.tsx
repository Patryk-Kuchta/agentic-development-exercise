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
import { signInSchema } from '@app/contract';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { Link, useNavigate } from 'react-router';

import { orpc } from '../api/client';
import { useAuth } from '../auth/context';

export function SignInPage() {
  const { signedIn } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { email: '', password: '' },
    validate: zod4Resolver(signInSchema),
  });

  const signIn = useMutation(
    orpc.auth.signIn.mutationOptions({
      onSuccess: (session) => {
        signedIn(session);
        void navigate('/');
      },
    }),
  );

  return (
    <Container size={420} py="xl">
      <Stack gap="lg">
        <Title order={1} fz="h2">
          Sign in
        </Title>

        <Card withBorder radius="md" padding="lg">
          <form
            onSubmit={form.onSubmit((values) => {
              signIn.mutate(values);
            })}
          >
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="ada@example.com"
                {...form.getInputProps('email')}
                key={form.key('email')}
              />
              <PasswordInput
                label="Password"
                {...form.getInputProps('password')}
                key={form.key('password')}
              />

              {/* Deliberately one message for a wrong password and an unknown
                  address, matching the API: telling them apart would tell a
                  stranger which addresses have accounts. */}
              {signIn.isError ? (
                <Alert color="red" variant="light" title="Could not sign in">
                  {isDefinedError(signIn.error)
                    ? 'That email and password do not match.'
                    : signIn.error.message}
                </Alert>
              ) : null}

              <Button type="submit" loading={signIn.isPending}>
                Sign in
              </Button>

              <Anchor component={Link} to="/sign-up" size="sm" ta="center">
                No account yet? Create one
              </Anchor>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Container>
  );
}
