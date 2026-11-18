import type { SVGProps } from 'react';

/** Rouge à lèvres et poudrier : même trait que les icônes Lucide (24 px, contour 2). */
export function BeautyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 10V4.5L7.5 3v7" />
      <rect x="3.5" y="10" width="4.5" height="3" rx="0.5" />
      <rect x="3" y="13" width="5.5" height="8" rx="0.5" />
      <path d="M12.2 15.8a6.2 6.2 0 1 1 7.6 1.2" />
      <path d="M14.2 12.4l3.6-3.6M15.6 13.8l3.6-3.6" />
      <path d="M11.5 20h10c-.4 1-1.2 1.5-2.3 1.5h-7.7" />
    </svg>
  );
}
