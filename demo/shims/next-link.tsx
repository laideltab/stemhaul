import type { AnchorHTMLAttributes } from "react";

// Hash-routed stand-in for next/link, used only by the single-file demo build.
export default function Link({ href, target: _target, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  void _target;
  return <a href={`#${href}`} {...rest} />;
}
