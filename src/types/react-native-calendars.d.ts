// Definiciones de tipos para react-native-calendars
declare module 'react-native-calendars' {
  export interface CalendarProps {
    current?: string;
    minDate?: string;
    maxDate?: string;
    onDayPress?: (day: { dateString: string; day: number; month: number; year: number; timestamp: number }) => void;
    markedDates?: {
      [date: string]: {
        selected?: boolean;
        marked?: boolean;
        startingDay?: boolean;
        endingDay?: boolean;
        disabled?: boolean;
        color?: string;
        textColor?: string;
      };
    };
    markingType?: 'dot' | 'period' | 'multi-dot' | 'multi-period' | 'custom';
  }

  export const Calendar: React.FC<CalendarProps>;
} 