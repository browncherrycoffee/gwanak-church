import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }
  if (!date) return "";
  // Standard parsing (YYYY-MM-DD, ISO strings)
  const d = new Date(date);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }
  // Dot-format full date: YYYY.MM.DD
  const dotFull = date.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (dotFull) {
    const d2 = new Date(Number(dotFull[1]), Number(dotFull[2]) - 1, Number(dotFull[3]));
    if (!Number.isNaN(d2.getTime())) {
      return d2.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    }
  }
  // Partial date: YYYY.MM or YYYY-MM (year + month only)
  const ym = date.match(/^(\d{4})[-.](\d{1,2})$/);
  if (ym) {
    const month = Number(ym[2]);
    if (month >= 1 && month <= 12) return `${ym[1]}년 ${month}월`;
    return `${ym[1]}년`;
  }
  return "";
}

export function formatShortDate(date: Date | string): string {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
  }
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function getBirthMonthDay(birthDate: string): { month: number; day: number } | null {
  const m = birthDate.match(/\d{4}[-.](\d{2})[-.](\d{2})/);
  if (!m) return null;
  const month = parseInt(m[1] ?? "0");
  const day = parseInt(m[2] ?? "0");
  if (!month || !day) return null;
  return { month, day };
}

export function daysUntilBirthday(birthDate: string, today: Date): number {
  const md = getBirthMonthDay(birthDate);
  if (!md) return Number.POSITIVE_INFINITY;
  const year = today.getFullYear();
  let next = new Date(year, md.month - 1, md.day);
  if (next.getTime() < today.getTime()) {
    next = new Date(year + 1, md.month - 1, md.day);
  }
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 이미지 파일을 리사이즈하여 base64 data URL로 변환
 */
export function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 전화번호 자동 포맷 (010-0000-0000)
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}
