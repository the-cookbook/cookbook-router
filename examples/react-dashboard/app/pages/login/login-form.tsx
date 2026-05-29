import React from 'react';
import { useNavigate, useRouter, useSearch } from '@cookbook/router-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ThemeProvider } from '@/components/theme-provider';
import { auth } from '@/state/auth';
import { cn, toArray } from '@/lib/utils';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const navigate = useNavigate();
  const { redirect } = useSearch('login');
  const router = useRouter();

  const handleOnSubmit = React.useCallback(() => {
    auth.authenticate();

    const [redirectTo] = toArray(redirect);
    const hasMatchedRoute = redirectTo ? router.match(redirectTo) : false;

    if (!hasMatchedRoute) {
      navigate.to('overview');

      return;
    }

    navigate.replace(hasMatchedRoute.id, hasMatchedRoute);
  }, [navigate, router, redirect]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="cookbook-theme">
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Login with account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOnSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value="jdoe@cookbook.com"
                    required
                  />
                </Field>
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value="cookbook-router"
                    required
                  />
                </Field>
                <Field>
                  <Button type="submit">Login</Button>
                  <FieldDescription className="text-center">
                    Don&apos;t have an account? <a href="#">Sign up</a>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <FieldDescription className="px-6 text-center">
          By clicking continue, you agree to our{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </FieldDescription>
      </div>
    </ThemeProvider>
  );
}
