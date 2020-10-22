import { Pipe, PipeTransform } from '@angular/core';
import { HomeSiteDtos } from '../models/homesite.model';

@Pipe({
    name: 'handings'
})
export class HandingsPipe implements PipeTransform
{
    transform(value: HomeSiteDtos.IHanding[]): string
    {
        return value.map(handing => HomeSiteDtos.Handing[handing.handingId]).join(', ');
    }
}
