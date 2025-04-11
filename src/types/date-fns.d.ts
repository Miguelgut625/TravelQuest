// Definiciones de tipos para date-fns
declare module 'date-fns' {
  export function format(date: Date, formatString: string, options?: object): string;
  export function addDays(date: Date, amount: number): Date;
  export function subDays(date: Date, amount: number): Date;
  export function startOfMonth(date: Date): Date;
  export function endOfMonth(date: Date): Date;
  export function getDaysInMonth(date: Date): number;
} 