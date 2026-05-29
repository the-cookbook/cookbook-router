const store = new Map<string, boolean>();

export const auth = {
  isAuthenticated() {
    return store.get('authenticated') === true;
  },

  authenticate() {
    store.set('authenticated', true);
  },

  logout() {
    store.delete('authenticated');
  },
};
