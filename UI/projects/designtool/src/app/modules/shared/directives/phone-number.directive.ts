import { Directive, HostListener, OnInit, ElementRef, PACKAGE_ROOT_URL, Input } from "@angular/core";
import { NgControl, FormControl } from "@angular/forms";
import { formatPhone } from "../classes/phoneUtils";


@Directive({
	selector: '[phone-number-directive]'
})
export class PhoneNumberDirective implements OnInit {
	private allowedKeys = [
		KeyCode.HOME,
		KeyCode.END,
		KeyCode.LEFT,
		KeyCode.RIGHT,
		KeyCode.SPACE,
		KeyCode.ENTER,
		KeyCode.DELETE,
		KeyCode.SHIFT,
		KeyCode.BACK_SPACE
	];

	constructor(private ngControl: NgControl) {	}

	ngOnInit(): void {
		if (this.ngControl.control.value) {
			let phone = formatPhone(this.ngControl.control.value);
			this.ngControl.control.patchValue(phone);
		}
	}
	
	/**
	 * restricts key presses
	 * @param e
	 */
	@HostListener('keydown', ['$event']) onKeyDown(e: KeyboardEvent) {
		if (// Allow: tab and shift+tab
			(e.keyCode == KeyCode.TAB || (e.shiftKey && e.keyCode == KeyCode.TAB)) ||
			// Allow: Ctrl+C
			(e.keyCode === KeyCode.C && (e.ctrlKey || e.metaKey)) ||
			// Allow: Ctrl+V
			(e.keyCode === KeyCode.V && (e.ctrlKey || e.metaKey)) ||
			// Allow: Ctrl+X
			(e.keyCode === KeyCode.X && (e.ctrlKey || e.metaKey)) ||
			// Allow: allowed keys
			(this.allowedKeys.some(k => k === e.keyCode)) ||
			// Allow: numbers
			((e.keyCode >= KeyCode._0 && e.keyCode <= KeyCode._9) || (e.keyCode >= KeyCode.NUMPAD0 && e.keyCode <= KeyCode.NUMPAD9))
		) {
			return;
		}

		e.preventDefault();
	}

	/**
	 * transforms input into formatted phone number
	 * @param e
	 */
	@HostListener('input', ['$event.target.value']) onInput(value: string) {
		let phone = formatPhone(value);
		this.ngControl.control.patchValue(phone);

		// Format After Numeric Values, CTRL+V, Space, BackSpace, Delete, Plus
		//if (((e.keyCode >= KeyCode._0 && e.keyCode <= KeyCode._9) || (e.keyCode >= KeyCode.NUMPAD0 && e.keyCode <= KeyCode.NUMPAD9)) ||
		//	(e.keyCode === KeyCode.V && (e.ctrlKey || e.metaKey)) ||
		//	(e.keyCode === KeyCode.SPACE) ||
		//	(e.keyCode === KeyCode.BACK_SPACE) ||
		//	(e.keyCode === KeyCode.DELETE) ||
		//	(e.keyCode === KeyCode.ADD)) {
		//	let phone = this.el.value;
		//	phone = formatPhone(phone);
		//	this.el.value = phone;
		//}
	}
}

enum KeyCode {
	LEFTCLICK = 1,
	MIDDLECLICK = 2,
	RIGHTCLICK = 3,
	HELP = 6,
	BACK_SPACE = 8,
	TAB = 9,
	CLEAR = 12,
	RETURN = 13,
	ENTER = 14,
	SHIFT = 16,
	CONTROL = 17,
	ALT = 18,
	PAUSE = 19,
	CAPS_LOCK = 20,
	ESCAPE = 27,
	SPACE = 32,
	PAGE_UP = 33,
	PAGE_DOWN = 34,
	END = 35,
	HOME = 36,
	LEFT = 37,
	UP = 38,
	RIGHT = 39,
	DOWN = 40,
	PRINTSCREEN = 44,
	INSERT = 45,
	DELETE = 46,
	_0 = 48,
	_1 = 49,
	_2 = 50,
	_3 = 51,
	_4 = 52,
	_5 = 53,
	_6 = 54,
	_7 = 55,
	_8 = 56,
	_9 = 57,
	SEMICOLON = 59,
	EQUALS = 61,
	A = 65,
	B = 66,
	C = 67,
	D = 68,
	E = 69,
	F = 70,
	G = 71,
	H = 72,
	I = 73,
	J = 74,
	K = 75,
	L = 76,
	M = 77,
	N = 78,
	O = 79,
	P = 80,
	Q = 81,
	R = 82,
	S = 83,
	T = 84,
	U = 85,
	V = 86,
	W = 87,
	X = 88,
	Y = 89,
	Z = 90,
	CONTEXT_MENU = 93,
	NUMPAD0 = 96,
	NUMPAD1 = 97,
	NUMPAD2 = 98,
	NUMPAD3 = 99,
	NUMPAD4 = 100,
	NUMPAD5 = 101,
	NUMPAD6 = 102,
	NUMPAD7 = 103,
	NUMPAD8 = 104,
	NUMPAD9 = 105,
	MULTIPLY = 106,
	ADD = 107,
	SEPARATOR = 108,
	SUBTRACT = 109,
	DECIMAL = 110,
	DIVIDE = 111,
	F1 = 112,
	F2 = 113,
	F3 = 114,
	F4 = 115,
	F5 = 116,
	F6 = 117,
	F7 = 118,
	F8 = 119,
	F9 = 120,
	F10 = 121,
	F11 = 122,
	F12 = 123,
	F13 = 124,
	F14 = 125,
	F15 = 126,
	F16 = 127,
	F17 = 128,
	F18 = 129,
	F19 = 130,
	F20 = 131,
	F21 = 132,
	F22 = 133,
	F23 = 134,
	F24 = 135,
	NUM_LOCK = 144,
	SCROLL_LOCK = 145,
	SHIFT_PLUS = 187,
	COMMA = 188,
	PERIOD = 190,
	SLASH = 191,
	BACK_QUOTE = 192,
	OPEN_BRACKET = 219,
	BACK_SLASH = 220,
	CLOSE_BRACKET = 221,
	QUOTE = 222,
	META = 224
}
