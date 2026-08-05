export function formatDate(isoDate) {
  if (!isoDate) return 'Not scheduled';

  const date = new Date(isoDate);
  const now = new Date();

  const dateNormalized = new Date(date);
  dateNormalized.setHours(0, 0, 0, 0);

  const nowNormalized = new Date(now);
  nowNormalized.setHours(0, 0, 0, 0);

  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const diffTime = dateNormalized.getTime() - nowNormalized.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let relativeText = '';
  if (diffDays === 0) {
    relativeText = 'Today';
  } else if (diffDays === 1) {
    relativeText = 'Tomorrow';
  } else if (diffDays > 1 && diffDays < 30) {
    relativeText = `in ${diffDays} days`;
  } else if (diffDays === -1) {
    relativeText = 'Yesterday';
  } else if (diffDays < 0 && diffDays > -30) {
    relativeText = `${Math.abs(diffDays)} days ago`;
  }

  return `${formatter.format(date)}${relativeText ? ` (${relativeText})` : ''}`;
}
