import {
  Link,
  Outlet,
  Slot,
  useHash,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from '@cookbook/router-react';

export function GalleryLayout() {
  return (
    <main className="shell stack">
      <Outlet />
      <Slot name="modal" context={{ source: 'gallery-modal-slot' }} />
    </main>
  );
}

export function GalleryIndexPage() {
  const navigate = useNavigate();
  return (
    <section className="panel stack">
      <h1>Gallery</h1>
      <p>
        These links navigate to canonical photo URLs while preserving the gallery as background UI.
      </p>
      <Link
        to="photos.show"
        params={{ id: '1' }}
        search={{ source: 'configured' }}
        hash="details"
        intercept="modal"
      >
        Open configured modal
      </Link>
      <Link
        to="photos.show"
        params={{ id: '2' }}
        search={{ source: 'call-site' }}
        hash="comments"
        intercept={{ slot: 'modal', component: PhotoModal }}
      >
        Open call-site modal
      </Link>
      <button
        type="button"
        onClick={() =>
          void navigate.to('photos.show', {
            params: { id: '3' },
            search: { source: 'button' },
            hash: 'details',
            intercept: { slot: 'modal', component: PhotoModal },
          })
        }
      >
        Open button modal
      </button>
    </section>
  );
}

export function PhotoPage() {
  const params = useParams('photos.show');
  const search = useSearchParams('photos.show');
  const hash = useHash();
  return (
    <article className="panel stack">
      <h1>Photo page {params.id}</h1>
      <p>source {search.source ?? 'direct'}</p>
      <p>hash {hash ?? 'none'}</p>
      <p>This is the canonical full page route rendered on direct visits.</p>
    </article>
  );
}

export function PhotoModal() {
  const params = useParams('photos.show');
  const context = useOutletContext<{ source: string }>();
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-label="Photo modal">
        <h1>Photo modal {params.id}</h1>
        <p>{context.source}</p>
        <p>The gallery route remains mounted behind this intercepted route.</p>
      </section>
    </div>
  );
}
