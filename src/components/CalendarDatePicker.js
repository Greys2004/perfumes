import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, radius, spacing, shadow } from '../theme';

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseDateString(dateString) {
  const [year, month, day] = String(dateString || '').split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

export function addMonths(dateString, months) {
  const date = parseDateString(dateString);
  date.setMonth(date.getMonth() + months);

  return getLocalDateString(date);
}

function getCalendarDays(dateString) {
  const selectedDate = parseDateString(dateString);
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  const weekDay = firstDay.getDay();
  const daysFromMonday = weekDay === 0 ? 6 : weekDay - 1;
  gridStart.setDate(firstDay.getDate() - daysFromMonday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      value: getLocalDateString(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === selectedDate.getMonth(),
    };
  });
}

export default function CalendarDatePicker({ label, value, onChange }) {
  const selectedValue = value || getLocalDateString();
  const selectedDate = parseDateString(selectedValue);
  const monthTitle = `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  const days = useMemo(() => getCalendarDays(selectedValue), [selectedValue]);
  const today = getLocalDateString();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{selectedValue}</Text>
        </View>
        <Pressable onPress={() => onChange(today)} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Hoy</Text>
        </Pressable>
      </View>

      <View style={styles.monthHeader}>
        <Pressable onPress={() => onChange(addMonths(selectedValue, -1))} style={styles.iconButton}>
          <Feather name="chevron-left" size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.monthTitle}>{monthTitle}</Text>
        <Pressable onPress={() => onChange(addMonths(selectedValue, 1))} style={styles.iconButton}>
          <Feather name="chevron-right" size={16} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.dayLabelRow}>
        {dayLabels.map((dayLabel, index) => (
          <Text key={`${dayLabel}-${index}`} style={styles.dayLabel}>
            {dayLabel}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const isSelected = day.value === selectedValue;
          const isToday = day.value === today;

          return (
            <Pressable
              key={day.value}
              onPress={() => onChange(day.value)}
              style={[
                styles.dayButton,
                !day.isCurrentMonth && styles.dayButtonMuted,
                isToday && styles.dayButtonToday,
                isSelected && styles.dayButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  !day.isCurrentMonth && styles.dayTextMuted,
                  isSelected && styles.dayTextActive,
                ]}
              >
                {day.day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  todayButton: {
    minHeight: 32,
    borderRadius: radius.sm - 4,
    backgroundColor: colors.gold,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  todayButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm - 4,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  dayLabelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayLabel: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 5,
  },
  dayButton: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm - 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayButtonMuted: {
    opacity: 0.35,
  },
  dayButtonToday: {
    borderColor: colors.lineStrong,
  },
  dayButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    ...shadow.glow,
  },
  dayText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  dayTextMuted: {
    color: colors.textSubtle,
  },
  dayTextActive: {
    color: colors.ink,
  },
});
