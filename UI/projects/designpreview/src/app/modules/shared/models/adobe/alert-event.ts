export class AlertEvent 
{
	event: string = 'Alert';
	alert: Alert = new Alert;

	constructor(message: string, type: string) 
	{
		this.alert.message = message;
		this.alert.type = type;
	}
}

export class Alert 
{
	message: string;
	type: string;
}