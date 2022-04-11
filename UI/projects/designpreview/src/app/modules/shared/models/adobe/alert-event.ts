export class AlertEvent {
	event: string = "Alert";
	alert: Alert = new Alert;

	constructor(message: string) {
			this.alert.message = message;
	}
}

export class Alert {
	message: string;
}