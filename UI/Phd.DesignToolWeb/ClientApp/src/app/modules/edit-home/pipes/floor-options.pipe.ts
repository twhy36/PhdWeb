import { Pipe, PipeTransform } from '@angular/core';

import { DecisionPoint } from '../../shared/models/tree.model.new';

@Pipe({
    name: 'floorOptions',
	pure: true
})
export class FloorOptionsPipe implements PipeTransform {
    transform(points: DecisionPoint[], floor: number) {
        return points.filter(pt => pt.choices.some((c: any) => c.options && c.options.some(opt => opt.floor === floor)))
            .map(pt => { return { ...pt, choices: pt.choices.filter((ch: any) => ch.options.some(opt => opt.floor === floor)) }; });
    }
}
