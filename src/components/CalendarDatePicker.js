import { useMemo, useState } from 'react';
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

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function updateDatePart(dateString, part, value) {
  const date = parseDateString(dateString);
  const year = part === 'year' ? value : date.getFullYear();
  const month = part === 'month' ? value : date.getMonth();
  const day = part === 'day' ? value : date.getDate();
  const clampedDay = Math.min(day, getDaysInMonth(year, month));

  return getLocalDateString(new Date(year, month, clampedDay));
}

export default function CalendarDatePicker({ label, value, onChange }) {
  const [openPicker, setOpenPicker] = useState('');
  const selectedValue = value || getLocalDateString();
  const selectedDate = parseDateString(selectedValue);
  const monthTitle = `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  const days = useMemo(() => getCalendarDays(selectedValue), [selectedValue]);
  const yearOptions = useMemo(() => {
    const selectedYear = selectedDate.getFullYear();

    return Array.from({ length: 17 }, (_, index) => selectedYear - 8 + index);
  }, [selectedDate]);
  const dayOptions = useMemo(() => {
    const totalDays = getDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth());

    return Array.from({ length: totalDays }, (_, index) => index + 1);
  }, [selectedDate]);
  const today = getLocalDateString();
  const selectedDay = selectedDate.getDate();
  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  function handlePartChange(part, nextValue) {
    onChange(updateDatePart(selectedValue, part, nextValue));
    setOpenPicker('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.valueParts}>
            <Pressable onPress={() => setOpenPicker(openPicker === 'day' ? '' : 'day')} style={styles.valuePart}>
              <Text style={styles.valuePartText}>{String(selectedDay).padStart(2, '0')}</Text>
            </Pressable>
            <Pressable onPress={() => setOpenPicker(openPicker === 'month' ? '' : 'month')} style={styles.valuePart}>
              <Text style={styles.valuePartText}>{monthNames[selectedMonth].slice(0, 3)}</Text>
            </Pressable>
            <Pressable onPress={() => setOpenPicker(openPicker === 'year' ? '' : 'year')} style={styles.valuePart}>
              <Text style={styles.valuePartText}>{selectedYear}</Text>
            </Pressable>
          </View>
        </View>
        <Pressable
          onPress={() => {
            setOpenPicker('');
            onChange(today);
          }}
          style={styles.todayButton}
        >
          <Text style={styles.todayButtonText}>Hoy</Text>
        </Pressable>
      </View>

      <View style={styles.monthHeader}>
        <Pressable
          onPress={() => {
            setOpenPicker('');
            onChange(addMonths(selectedValue, -1));
          }}
          style={styles.iconButton}
        >
          <Feather name="chevron-left" size={16} color={colors.text} />
        </Pressable>
        <View style={styles.monthTitleRow}>
          <Pressable onPress={() => setOpenPicker(openPicker === 'month' ? '' : 'month')}>
            <Text style={styles.monthTitle}>{monthNames[selectedMonth]}</Text>
          </Pressable>
          <Pressable onPress={() => setOpenPicker(openPicker === 'year' ? '' : 'year')}>
            <Text style={styles.monthTitle}>{selectedYear}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            setOpenPicker('');
            onChange(addMonths(selectedValue, 1));
          }}
          style={styles.iconButton}
        >
          <Feather name="chevron-right" size={16} color={colors.text} />
        </Pressable>
      </View>

      {!!openPicker && (
        <View style={styles.quickPicker}>
          {openPicker === 'month' && monthNames.map((monthName, index) => (
            <Pressable
              key={monthName}
              onPress={() => handlePartChange('month', index)}
              style={[styles.quickOption, selectedMonth === index && styles.quickOptionActive]}
            >
              <Text style={[styles.quickOptionText, selectedMonth === index && styles.quickOptionTextActive]}>
                {monthName.slice(0, 3)}
              </Text>
            </Pressable>
          ))}

          {openPicker === 'year' && yearOptions.map((year) => (
            <Pressable
              key={year}
              onPress={() => handlePartChange('year', year)}
              style={[styles.quickOption, selectedYear === year && styles.quickOptionActive]}
            >
              <Text style={[styles.quickOptionText, selectedYear === year && styles.quickOptionTextActive]}>
                {year}
              </Text>
            </Pressable>
          ))}

          {openPicker === 'day' && dayOptions.map((day) => (
            <Pressable
              key={day}
              onPress={() => handlePartChange('day', day)}
              style={[styles.dayQuickOption, selectedDay === day && styles.quickOptionActive]}
            >
              <Text style={[styles.quickOptionText, selectedDay === day && styles.quickOptionTextActive]}>
                {day}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

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
              onPress={() => {
                setOpenPicker('');
                onChange(day.value);
              }}
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
  valueParts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  valuePart: {
    minHeight: 30,
    borderRadius: radius.sm - 4,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  valuePartText: {
    color: colors.text,
    fontSize: 13,
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
  monthTitleRow: {
    flex: 1,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  quickPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  quickOption: {
    width: '23.5%',
    minHeight: 32,
    borderRadius: radius.sm - 4,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayQuickOption: {
    width: `${100 / 7 - 1}%`,
    minHeight: 28,
    borderRadius: radius.sm - 5,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickOptionActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  quickOptionText: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '900',
  },
  quickOptionTextActive: {
    color: colors.ink,
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
