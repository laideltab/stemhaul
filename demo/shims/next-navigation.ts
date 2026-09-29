import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
export const currentPath = () => window.location.hash.replace(/^#/, "") || "/";

export function usePathname() {
  return useSyncExternalStore(subscribe, currentPath, () => "/");
}

const go = (to: string) => {
  window.location.hash = to;
  window.scrollTo(0, 0);
};
const router = { push: go, replace: go, back: () => history.back() };
export function useRouter() {
  return router;
}
