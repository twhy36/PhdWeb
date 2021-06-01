
export class LinkAction
{
	envBaseUrl: string;
	path: string;
	clicked: Function;

	constructor(data: ILinkAction)
	{
		if (data)
		{
			this.envBaseUrl = data.envBaseUrl || null;
			this.path = data.path || null;
			this.clicked = data.clicked || null;
		}
	}
}

export interface ILinkAction
{
	envBaseUrl: string;
	path: string;
	clicked: Function;
}
