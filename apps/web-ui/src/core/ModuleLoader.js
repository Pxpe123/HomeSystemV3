/** One shared request for background warming and first render; failures can retry. */
export function createModuleLoader(importModule) {
  let pending;
  return function load() {
    if (!pending) {
      pending = Promise.resolve()
        .then(importModule)
        .catch((error) => {
          pending = undefined;
          throw error;
        });
    }
    return pending;
  };
}
