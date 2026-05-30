# React dashboard example

`examples/react-dashboard` is a production-style dashboard app that uses Cookbook Router with React, generated route contracts, async route components, layout-level loading and error fallbacks, layout slots, custom path constraints, search params, middleware, link-level route interception, and navigation blocking.

## What it demonstrates

- Shared shell layout across the overview, users, documents, reports, create, messages, broken-page, policy, and not-found demo routes.
- Async page components that suspend during navigation, making layout-level loading states easy to preview.
- `layout.loading` fallbacks rendered inside the shared layout outlet.
- `layout.error` boundaries rendered inside the shared layout when a child route throws.
- Route-specific layout slots for headers, sidebars, and modals.
- Link-level route interception from `/overview` to `/create` through the `modal` slot.
- Link-level route interception from any shell-backed page to `/messages/new` through the `modal` slot.
- Link-level route interception from `/documents` to `/documents/{documentId}` through the `modal` slot.
- Sheet-based document previews rendered inside the `modal` slot.
- Direct rendering of `/create` as a full page when visited directly.
- Direct rendering of `/documents/{documentId}` as a full document detail page when visited directly.
- Navigation blocking on `/messages/new` with `useBlocker()` when the message form has unsaved changes.
- Custom sidebar rendering on `/reports`.
- Document library with contextual preview behavior for intercepted document detail routes.
- Generated TypeScript route contracts from `app/routes.ts`.
- Custom `slug` path constraint for `/users/{slug:slug}`.
- Search-param handling on `/overview?visitors=...`.
- `NavLink` matching that keeps the overview item active while ignoring search params.
- User-detail not-found handling for missing user records.
- Document-detail not-found handling for missing document records.
- Route error handling through the broken-page demo route.
- Fake policy pages for terms of service and privacy policy routes.

## Run it

From the repository root:

```sh
pnpm install
pnpm build:packages
pnpm --filter react-dashboard dev
```

## Validate generated route contracts

```sh
pnpm --filter react-dashboard routes:generate
pnpm --filter react-dashboard routes:validate
```

The generated files live in `.cookbook-router/` and are committed so type inference can be tested without requiring a generation step first.

## Test it

```sh
pnpm --filter react-dashboard test
pnpm --filter react-dashboard typecheck
pnpm --filter react-dashboard build
```

The unit tests cover entry redirects, async layout loading behavior, search-preserving active navigation, link-level route interception, canonical full-page rendering, sheet-based document previews, navigation blocking for dirty forms, custom slug params, missing-record handling, broken-page error fallback rendering, and generated contract inference.

## Async loading and route errors

Dashboard pages are loaded with `React.lazy()` and an intentional delay so route-level async rendering is easy to see during development and tests. Each shell-backed route uses `layout.loading: LoadingSkeleton`, so the sidebar, header area, and layout chrome stay mounted while the route outlet shows the skeleton.

The `/broken-page` route intentionally throws from its page component:

```ts
{
  id: 'broken-page',
  path: '/broken-page',
  component: AsyncBrokenPage,
  layout: {
    component: LayoutPage,
    loading: LoadingSkeleton,
    error: ErrorPage,
  },
}
```

This demonstrates `layout.error`: the fallback is owned by the route layout and renders inside the same layout shell instead of replacing the whole application.

Because the example uses a delayed lazy import, tests that assert page body content use a timeout longer than `LAZY_PAGE_DELAY_MS`.

## Link-level route interception

The app demonstrates route interception at the link level.

Instead of declaring every intercept in the route config, individual links can opt into interception when they navigate. This keeps routes canonical while allowing specific navigation paths to render through contextual UI.

For example, document cards link to the canonical document detail route while asking the router to render the destination through the `modal` slot:

```tsx
<Link
  to="documents.details"
  params={{ documentId: document.id }}
  className="hover:underline"
  intercept={{
    slot: 'modal',
    component: DocumentPreview,
  }}
>
  {document.title}
</Link>
```

Client navigation from `/documents` to `/documents/{documentId}` opens a document preview sheet and preserves the document library page behind it. Direct visits to `/documents/{documentId}` render the full document detail page.

The same pattern is used for modal-style flows such as creating records or composing messages. A link can navigate to the canonical destination route while choosing whether that navigation should render through a layout slot.

## Navigation blocking

The `/messages/new` route demonstrates navigation blocking with `useBlocker()`.

The message composer tracks form state locally and blocks navigation when any field has a value.
The blocker warns users before they leave with an unsent message draft.

```tsx
function NewMessage() {
  const navigate = useNavigate();

  const [formData, setFormData] = React.useState<MessageFormData>({
    name: '',
    email: '',
    message: '',
  });

  useBlocker({
    when: Boolean(formData.name || formData.email || formData.message),
    message: 'Your message has not been sent. Leave this page and discard your draft?',
  });

  const handleOnClose = React.useCallback(() => {
    navigate.back();
  }, [navigate]);

  // ...
}
```

This applies both when `/messages/new` is rendered as an intercepted modal and when it is visited directly as a canonical route.

## Documents preview behavior

The documents section demonstrates a common dashboard pattern:

- `/documents` renders a document library.
- Clicking a document link from `/documents` navigates to `/documents/{documentId}` with link-level interception enabled.
- The intercepted navigation renders the document preview as a sheet inside the `modal` slot.
- Visiting `/documents/{documentId}` directly renders the full document detail page.
- Closing the preview sheet returns to `/documents`.

This shows how the same route can support both contextual preview UI and canonical direct rendering.

## Route model

```txt
/                           -> redirects to /overview
/overview                   -> dashboard overview
/create                     -> canonical create page
/users                      -> users index
/users/{slug:slug}          -> user details
/documents                  -> document library
/documents/{documentId}     -> document details
/reports                    -> reports dashboard
/messages/new               -> message composer with dirty-form navigation blocking
/broken-page                -> intentionally throwing route rendered through layout.error
/login                      -> login page
/policies/terms-of-service  -> fake terms of service page
/policies/privacy-policy    -> fake privacy policy page
/*                          -> not found page
```
