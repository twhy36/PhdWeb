import { AbstractControl } from "@angular/forms";
import { isValidUSPhoneLength } from "./phoneUtils";

/**
 * Validates Email
 * @param control
 */
export function customEmailValidator(control: AbstractControl): { [key: string]: any }
{
	if (control.value)
	{
		const validEmail = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@([a-zA-Z]|[a-zA-Z0-9]?[a-zA-Z0-9-]+[a-zA-Z0-9])\.[a-zA-Z0-9]{2,10}(?:\.[a-zA-Z]{2,10})?$/.test(control.value);

		if (!validEmail)
		{
			return { 'email': {} };
		}
	}

	return null;
}

/**
 * Validates value is not one or more spaces
 * @param control
 */
export function noWhiteSpaceValidator(control: AbstractControl): { [key: string]: any }
{
	if (control.value)
	{
		const isWhitespace = control.value.trim().length === 0;
		const isValid = !isWhitespace;

		return isValid ? null : { 'whitespace': true };
	}

	return null;
}

/**
 * Validates Phone Number
 * @param control
 */
export function phoneValidator(control: AbstractControl): { [key: string]: any }
{
	if (control.value)
	{
		return isValidUSPhoneLength(control.value) ? null : { 'phone number': {} };
	}

	return null;
}
