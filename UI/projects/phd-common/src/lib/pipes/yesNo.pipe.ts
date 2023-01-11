import { Pipe } from '@angular/core';

@Pipe({ name: 'yesNo' })

export class YesNoPipe
{
    constructor() { }

    transform(boolValue: boolean)
    {
        return boolValue === true ? 'Y' : 'N';
    }
}
