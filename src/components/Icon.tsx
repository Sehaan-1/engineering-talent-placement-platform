// Uniform-stroke geometric SVG icon set. Inherits solid `currentColor`
// with a single stroke weight so icons stay crisp and optically consistent.

import type { CSSProperties, ReactNode } from "react";

export type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
};

function make(name: string, path: ReactNode, viewBox = "0 0 24 24") {
  function IconComponent({
    size = 18,
    strokeWidth = 1.75,
    className,
    style,
  }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={{ flexShrink: 0, ...style }}
        aria-hidden="true"
      >
        {path}
      </svg>
    );
  }
  IconComponent.displayName = name;
  return IconComponent;
}

export const IconBuilding = make(
  "IconBuilding",
  <>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </>
);

export const IconDashboard = make(
  "IconDashboard",
  <>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </>
);

export const IconUsers = make(
  "IconUsers",
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M21 18c0-2.5-1.8-4-4-4" />
  </>
);

export const IconClock = make(
  "IconClock",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>
);

export const IconPipeline = make(
  "IconPipeline",
  <>
    <rect x="3" y="4" width="4" height="16" rx="1" />
    <rect x="10" y="4" width="4" height="16" rx="1" />
    <rect x="17" y="4" width="4" height="16" rx="1" />
  </>
);

export const IconInterview = make(
  "IconInterview",
  <>
    <path d="M21 12a9 9 0 1 1-3.5-7.1" />
    <path d="M21 4v5h-5" />
  </>
);

export const IconStack = make(
  "IconStack",
  <>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 12l9 5 9-5" />
    <path d="M3 17l9 5 9-5" />
  </>
);

export const IconSettings = make(
  "IconSettings",
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </>
);

export const IconMenu = make(
  "IconMenu",
  <>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </>
);

export const IconPlus = make(
  "IconPlus",
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>
);

export const IconSearch = make(
  "IconSearch",
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>
);

export const IconArrowRight = make(
  "IconArrowRight",
  <>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </>
);

export const IconArrowLeft = make(
  "IconArrowLeft",
  <>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </>
);

export const IconCheck = make("IconCheck", <path d="m4 12 5 5L20 6" />);

export const IconCheckCircle = make(
  "IconCheckCircle",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.8-4.8" />
  </>
);

export const IconAlertCircle = make(
  "IconAlertCircle",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4.5" />
    <path d="M12 16h.01" />
  </>
);

export const IconX = make(
  "IconX",
  <>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </>
);
export const IconClose = IconX;

export const IconCode = make(
  "IconCode",
  <>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </>
);

export const IconTrash = make(
  "IconTrash",
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </>
);

export const IconEdit = make(
  "IconEdit",
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </>
);

export const IconMapPin = make(
  "IconMapPin",
  <>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </>
);

export const IconMail = make(
  "IconMail",
  <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </>
);

export const IconPhone = make(
  "IconPhone",
  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
);

export const IconStar = make(
  "IconStar",
  <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z" />
);

export const IconBolt = make(
  "IconBolt",
  <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
);

export const IconHeart = make(
  "IconHeart",
  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
);

export const IconGlobe = make(
  "IconGlobe",
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </>
);

export const IconShield = make(
  "IconShield",
  <path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3z" />
);

export const IconTrendUp = make(
  "IconTrendUp",
  <>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M14 7h7v7" />
  </>
);

export const IconTrendDown = make(
  "IconTrendDown",
  <>
    <path d="m3 7 6 6 4-4 8 8" />
    <path d="M14 17h7v-7" />
  </>
);

export const IconCalendar = make(
  "IconCalendar",
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </>
);

export const IconDollar = make(
  "IconDollar",
  <>
    <path d="M12 1v22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </>
);

export const IconBriefcase = make(
  "IconBriefcase",
  <>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </>
);

export const IconLink = make(
  "IconLink",
  <>
    <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </>
);

export const IconCopy = make(
  "IconCopy",
  <>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>
);

export const IconLogout = make(
  "IconLogout",
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </>
);

export const IconFilter = make(
  "IconFilter",
  <path d="M3 4h18l-7 9v6l-4 2v-8L3 4z" />
);

export const IconSliders = make(
  "IconSliders",
  <>
    <line x1="4" y1="6" x2="20" y2="6" />
    <circle cx="9" cy="6" r="2" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <circle cx="15" cy="12" r="2" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="10" cy="18" r="2" />
  </>
);

// Kept as a restrained target/radar glyph for legacy imports; avoids decorative AI sparkle shorthand.
export const IconSparkle = make(
  "IconSparkle",
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
  </>
);

export const IconHourglass = make(
  "IconHourglass",
  <>
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.17a2 2 0 0 0-.59-1.41L12 12l-4.41-3.42A2 2 0 0 1 7 7.17V2" />
    <path d="M7 2v4.17a2 2 0 0 0 .59 1.41L12 12l4.41 3.42a2 2 0 0 1 .59 1.41V22" />
  </>
);

export const IconUser = make(
  "IconUser",
  <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>
);

export const IconArrowUpRight = make(
  "IconArrowUpRight",
  <>
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </>
);

export const IconBell = make(
  "IconBell",
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </>
);

export const IconUpload = make(
  "IconUpload",
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>
);

export const IconDownload = make(
  "IconDownload",
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>
);

export const IconFileText = make(
  "IconFileText",
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </>
);

export const IconChevronDown = make(
  "IconChevronDown",
  <polyline points="6 9 12 15 18 9" />
);

export const IconChevronLeft = make(
  "IconChevronLeft",
  <polyline points="15 18 9 12 15 6" />
);

export const IconChevronRight = make(
  "IconChevronRight",
  <polyline points="9 18 15 12 9 6" />
);

export const IconReplay = make(
  "IconReplay",
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </>
);
