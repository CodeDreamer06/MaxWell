import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type IconProps = ComponentPropsWithoutRef<"svg"> & { title?: string };

function BaseIcon({
  className,
  children,
  title = "Icon",
  ...props
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
      aria-hidden
      {...props}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

export function SpinnerIcon({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={cn("animate-spin", className)} {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </BaseIcon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m3 10.5 9-7 9 7" />
      <path d="M5 9.5V20h14V9.5" />
    </BaseIcon>
  );
}

export function IntakeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 4h10" />
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
    </BaseIcon>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 6.5h14a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 19 17.5h-7l-4.5 3v-3H5A2.5 2.5 0 0 1 2.5 15V9A2.5 2.5 0 0 1 5 6.5Z" />
    </BaseIcon>
  );
}

export function HospitalIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </BaseIcon>
  );
}

export function ReferralIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 13h6" />
      <path d="M9 16.5h4" />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
      <path d="M19.1 15.1a1 1 0 0 0 .2 1.1l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v.3a1.9 1.9 0 0 1-3.8 0v-.3a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6h-.3a1.9 1.9 0 1 1 0-3.8h.3a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9v-.3a1.9 1.9 0 0 1 3.8 0v.3a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.3a1.9 1.9 0 1 1 0 3.8h-.3a1 1 0 0 0-.9.6Z" />
    </BaseIcon>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
      <path d="m5 16 1 2.6L8.6 20 6 21l-1 2.5L4 21l-2.5-1 2.5-1.4L5 16Z" />
      <path d="m19 14 1 2.2L22 17l-2 .8-1 2.2-.8-2.2-2.2-.8 2.2-.8L19 14Z" />
    </BaseIcon>
  );
}

export function LocationIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 21s6.5-5 6.5-10A6.5 6.5 0 1 0 5.5 11c0 5 6.5 10 6.5 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.3-3.3" />
    </BaseIcon>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m3 11.5 17-8-4 17-3.8-6.2L3 11.5Z" />
    </BaseIcon>
  );
}

export function AttachmentIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9.5 12.5v-4a3.5 3.5 0 0 1 7 0v7a5.5 5.5 0 0 1-11 0v-8" />
    </BaseIcon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </BaseIcon>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M6.5 8.5A7 7 0 0 1 20 11" />
      <path d="M17.5 15.5A7 7 0 0 1 4 13" />
    </BaseIcon>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3 2.7 5.4 6 1-4.4 4.3 1 6.1L12 17l-5.3 2.8 1-6.1L3.3 9.4l6-1L12 3Z" />
    </BaseIcon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
    </BaseIcon>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 7 20V5A1.5 1.5 0 0 1 8.5 3.5Z" />
      <path d="M15 3.5V8h4" />
      <path d="M10 12h6" />
      <path d="M10 15h6" />
      <path d="M10 18h4" />
    </BaseIcon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4v11" />
      <path d="m8.5 11.5 3.5 3.5 3.5-3.5" />
      <path d="M4 19.5h16" />
    </BaseIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </BaseIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m5 12 4 4L19 7" />
    </BaseIcon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </BaseIcon>
  );
}
