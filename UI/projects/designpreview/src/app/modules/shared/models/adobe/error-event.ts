export class ErrorEvent 
{
	event: string = 'Error';
	error: Error = new Error;

	constructor(message: string) 
	{
		this.error.message = message;
	}
}

export class Error 
{
	message: string;
}