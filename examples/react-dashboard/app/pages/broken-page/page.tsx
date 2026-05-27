export function BrokenPage(): React.ReactNode {
  throw Error(
    'Broken page demo: this route intentionally failed so the error boundary can be previewed.'
  );
}
