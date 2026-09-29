import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const money = (cents: number) => usd.format(cents / 100);
export const perStem = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export const num = (n: number) => n.toLocaleString("en-US");

export const date = (iso: string) =>
  new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
export const localDay = (iso: string) => new Date(iso).toDateString();
