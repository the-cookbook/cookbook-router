import * as React from 'react';
import { Progress as ProgressPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

interface ProgressBarProps extends React.ComponentProps<
  typeof ProgressPrimitive.Root
> {
  value: number;
  duration?: number;
  delay?: number;
  indicatorClassName?: string;
}

export function ProgressBar({
  value,
  duration = 700,
  delay = 200,
  className,
  indicatorClassName,
  ...props
}: ProgressBarProps) {
  const [currentValue, setCurrentValue] = React.useState(0);

  React.useEffect(() => {
    let frame: number | undefined;

    const timeout = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        setCurrentValue(value);
      });
    }, delay);

    return () => {
      window.clearTimeout(timeout);

      if (frame !== undefined) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [value, delay]);

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'relative h-1 w-full overflow-hidden rounded-full bg-muted',
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          'h-full w-full flex-1 bg-primary transition-transform ease-out',
          indicatorClassName
        )}
        style={{
          transform: `translateX(-${100 - currentValue}%)`,
          transitionDuration: `${duration}ms`,
        }}
      />
    </ProgressPrimitive.Root>
  );
}
