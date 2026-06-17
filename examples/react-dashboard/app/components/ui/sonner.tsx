// @ts-nocheck
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',

          '--success-bg': 'var(--toast-success-bg)',
          '--success-text': 'var(--toast-success-text)',
          '--success-border': 'var(--toast-success-border)',

          '--info-bg': 'var(--toast-info-bg)',
          '--info-text': 'var(--toast-info-text)',
          '--info-border': 'var(--toast-info-border)',

          '--warning-bg': 'var(--toast-warning-bg)',
          '--warning-text': 'var(--toast-warning-text)',
          '--warning-border': 'var(--toast-warning-border)',

          '--error-bg': 'var(--toast-error-bg)',
          '--error-text': 'var(--toast-error-text)',
          '--error-border': 'var(--toast-error-border)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
