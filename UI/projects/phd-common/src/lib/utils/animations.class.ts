import { trigger, transition, style, animate, state } from '@angular/animations';

export const flipOver = trigger('flipOver', [
	transition(':enter', [
		style({ transform: 'rotateY(3.142rad)', opacity: 0 }),
		animate('250ms 125ms ease-in', style({ transform: 'rotateY(0)', opacity: 1 }))
	]),
	transition(':leave', [
		style({ opacity: 1 }),
		animate('250ms ease-out', style({ transform: 'rotateY(3.142rad)', opacity: 0 }))
	])
]);

export const flipOver2 = trigger('flipOver', [
	transition(':enter', [
		style({ opacity: 0 }),
		animate('250ms ease-in', style({ opacity: 1 }))
	]),
	transition(':leave', [
		style({ opacity: 1 }),
		animate('250ms ease-out', style({ transform: 'rotateY(3.142rad)', opacity: 0 }))
	])
]);

export const flipOver3 = trigger('flipOver', [
	transition(':enter', [
		style({ opacity: 0, height: 0, overflow: 'hidden' }),
		animate('250ms ease-in', style({ opacity: 1, height: '*' }))
	]),
	transition(':leave', [
		style({ opacity: 1 }),
		animate('250ms ease-out', style({ opacity: 0 }))
	])
]);

export const slideOut = trigger('slideOut', [
	transition(':enter', [
		style({ height: 0, opacity: 0, padding: 0 }),
		animate('250ms ease-in', style({ height: '*', opacity: 1, padding: '0 0 20px 0' }))
	]),
	transition(':leave', [
		style({ opacity: 1, padding: 0 }),
		animate('250ms ease-out', style({ padding: 0, opacity: 0, height: 0 }))
	])
]);

export const blink = trigger('blink', [
	state('true', style({ backgroundColor: 'transparent' })),
	transition('* => true', [
		style({ backgroundColor: 'lightblue' }),
		animate('1.25s ease-in')
	])
]);
