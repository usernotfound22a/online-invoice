// lib/format.js — Money, dates, number formatting
module.exports = {
  money(n) {
    if (n === null || n === undefined) n = 0;
    const num = Math.round(parseFloat(n) * 100) / 100;
    // Indian/Nepali grouping: 1,25,000
    const parts = num.toFixed(2).split('.');
    let intPart = parts[0];
    const isNeg = intPart.startsWith('-');
    if (isNeg) intPart = intPart.slice(1);
    let last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    if (rest.length) last3 = ',' + last3;
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + last3;
    return (isNeg ? '-' : '') + 'Rs ' + grouped + '.' + parts[1];
  },
  moneyPlain(n) {
    if (n === null || n === undefined) n = 0;
    return 'Rs ' + Math.round(parseFloat(n)).toLocaleString('en-IN');
  },
  date(d) {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  dateInput(d) {
    if (!d) return new Date().toISOString().slice(0, 10);
    if (typeof d === 'string' && d.length >= 10) return d.slice(0, 10);
    return new Date(d).toISOString().slice(0, 10);
  },
  statusBadge(status) {
    const colors = {
      draft: '#6b7280',
      sent: '#3b82f6',
      paid: '#10b981',
      partial: '#f59e0b',
      overdue: '#ef4444',
      cancelled: '#9ca3af'
    };
    return colors[status] || '#6b7280';
  }
};
