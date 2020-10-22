import { Pipe, PipeTransform } from '@angular/core';
import { ISalesPhase } from '../../shared/models/pricing.model';

@Pipe({
    name: 'planPhases'
})
export class PlanPhasesPipe implements PipeTransform {
    transform(value: ISalesPhase[]): any {
		if (!value) return [];

        let plans = value[0].phasePlans.map(p => p.plan);
        let result = plans.map(p => {
            let row = {
                _id: p.id,
                _name: p.salesName,
				_isActive: p.isActive
            }
            value.forEach(v => {
                const plan = v.phasePlans.find(pp => pp.plan.id === p.id);
                row[v.salesPhaseName] = plan ? plan.listPrice : 0;
            });
            return row;
        });
        return result;
    }
}
