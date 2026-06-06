import React from 'react';
import {
  useNavigate,
  type RouterErrorFallbackProps,
} from '@cookbook/router-react';

import { ErrorState } from '@/components/error-state';

export function ErrorPage(props: RouterErrorFallbackProps) {
  const navigate = useNavigate();

  console.log(props.reset);
  const handleOnGoBack = React.useCallback(() => {
    if (!window.history.state.length) {
      navigate.to('overview');
      return;
    }

    navigate.back();
  }, [navigate]);

  return (
    <ErrorState
      description={
        <>
          The page failed to load. Try again or go back to the previous page.
          <br />
          <br />
          Error:{' '}
          {props.error instanceof Error
            ? JSON.stringify(props.error.message)
            : 'unknown'}
          <br />
          <br />
          {props.route ? `Route: ${props.route.id}` : ''}
        </>
      }
      onRetry={props.reset}
      onBack={handleOnGoBack}
    />
  );
}
