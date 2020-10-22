export function formatPhone(phoneNumber: string) {
	var formattedPhone = '';
	var i;
	var c;

	phoneNumber = stripInvalidDigitsFromUSPhone(stripPhoneNumber(phoneNumber));

	// Search through number and append to unfiltered values to formattedNumber. //
	if (phoneNumber.length) {

		for (i = 0; i < 10; i++) {

			c = phoneNumber.charAt(i);

			if (i == 0) formattedPhone += '(';
			if (i == 3 && phoneNumber.length > 3) formattedPhone += ')';
			if (i == 3 && phoneNumber.length > 3) formattedPhone += ' ';
			if (i == 6 && phoneNumber.length > 6) formattedPhone += '-';
			//if (i == 10 && phoneNumber.length > 10) formattedPhone += ' #';
			formattedPhone += c;
		}
	}

	return formattedPhone;
}

export function stripPhoneNumber(phoneNumber: string) {
	if (!!phoneNumber) {
		phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
	}

	return phoneNumber;
}

export function isValidUSPhoneLength(phoneNumber: string) {

	phoneNumber = stripPhoneNumber(phoneNumber);

	if (!!phoneNumber && phoneNumber.length < 10) {
		return false;
	}

	if (!!phoneNumber && phoneNumber.length > 15) {
		return false;
	}

	return true;
}

function stripInvalidChars(phoneNumber: string) {
	if (!!phoneNumber) {
		phoneNumber = phoneNumber.replace(/[^0-9\s\#]/g, '');
		phoneNumber = phoneNumber.replace(/(#)(?=.*\1)/g, "");
		phoneNumber = phoneNumber.replace(/(#)/g, ' $1');
	}

	return phoneNumber;
}

function stripInvalidDigitsFromUSPhone(strippedPhoneNumber: string) {
	if (!strippedPhoneNumber) {
		strippedPhoneNumber = '';
	}

	// Remove first 0 or 1 from area code
	if (strippedPhoneNumber.length && (strippedPhoneNumber.substring(0, 1) == '0' || strippedPhoneNumber.substring(0, 1) == '1')) {
		strippedPhoneNumber = replaceAt(0, strippedPhoneNumber, '');
	}

	// Remove first 0 or 1 from phone unit
	if (strippedPhoneNumber.length > 3 && (strippedPhoneNumber.substring(3, 4) == '0' || strippedPhoneNumber.substring(3, 4) == '1')) {
		strippedPhoneNumber = replaceAt(3, strippedPhoneNumber, '');
	}

	return strippedPhoneNumber;
}

function hasWhiteSpace(s: string) {
	return /\s/g.test(s);
};

function replaceAt(index: number, source: string, char: string) {
	return source.substr(0, index) + char + source.substr(index + char.length);
}
