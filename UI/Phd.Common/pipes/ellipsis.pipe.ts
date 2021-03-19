import { Pipe } from '@angular/core';

@Pipe({ name: 'ellipsis' })

export class EllipsisPipe
{
	constructor() { }

	transform(textValue: string, length: number)
	{
		return textValue.length > length ? textValue.slice(0, length).trim().concat('...') : textValue;
	}
}
