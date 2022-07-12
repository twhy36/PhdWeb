export class Alert
{
	type: AlertType;
	message: string;
	dismissible: boolean;
	hide: boolean;

	private _timer: any;

	constructor(type: AlertType, message: string, dismissible: boolean, autoClose: boolean)
	{
		this.type = type;
		this.message = message;
		this.dismissible = dismissible && dismissible;
		this.hide = false;

		if (autoClose)
		{
			let timeout = 2000;

			switch (type)
			{
				case AlertType.Success:
				case AlertType.Info:
				case AlertType.Warning:
					timeout = 2000;
					break;
				case AlertType.Error:
					timeout = 4000;
					break;
				default:
					timeout = 2000;
			}

			this._timer = setTimeout(() => this.hide = true, timeout);
		}
	}

	dispose()
	{
		if (this._timer) clearTimeout(this._timer);
	}
}

export enum AlertType
{
	Success,
	Error,
	Info,
	Warning
}
