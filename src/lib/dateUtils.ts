export function getPreviousMonth(dateString: string): string {
  const [year, month] = dateString.split('-').map(Number);

  if (month === 1) {
    return `${year - 1}-12`;
  }

  const previousMonth = month - 1;
  return `${year}-${previousMonth.toString().padStart(2, '0')}`;
}

export function compareDates(date1: string, date2: string): number {
  const [year1, month1] = date1.split('-').map(Number);
  const [year2, month2] = date2.split('-').map(Number);

  if (year1 !== year2) {
    return year1 - year2;
  }

  return month1 - month2;
}

export function validateDateFormat(date: string): boolean {
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(date)) {
    return false;
  }

  const [year, month] = date.split('-').map(Number);

  if (year < 1900 || year > 2100) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  return true;
}
