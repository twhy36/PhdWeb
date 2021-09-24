import * as moment from 'moment';

export function getDaysInMonth(year, month) {
	let d = new Date(year, month + 1, 0);
	return d.getDate();
}

export function addMonths(date, value) {
	let d = new Date(date),
		n = date.getDate();
	d.setDate(1);
	d.setMonth(d.getMonth() + value);
	d.setDate(Math.min(n, getDaysInMonth(d.getFullYear(), d.getMonth())));
	return d;
}

export function monthRange(date1, date2) {
	return `${date1.toLocaleString('en-us', { month: 'long' })} through ${date2.toLocaleString('en-us', { month: 'long' })}`;
}

export function convertDateToUtcString(date: Date): string
{
	return moment.utc(date).format('L');
}

// Return date format string with UTC offset '2021-09-20T20:05:56-04:00'
export function getDateWithUtcOffset(date?: Date): string
{
	const utcOffset = moment().utcOffset();
	const offsetHours = Math.floor(Math.abs(utcOffset) / 60);
	const offseMinutes = Math.abs(utcOffset) % 60;
	const offsetSign = utcOffset >= 0 ? '+' : '-';

	const hours = (offsetHours <= 9 ? '0' : '') + offsetHours;          
	const minutes = (offseMinutes <= 9 ? '0' : '') + offseMinutes;

	const today = moment.utc(date ?? new Date()).format('YYYY-MM-DDTHH:mm:ss');
	return `${today}${offsetSign}${hours}:${minutes}`;
}
