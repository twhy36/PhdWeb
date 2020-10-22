import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'choiceSelections',
	pure: true
})
export class ChoiceSelectionsPipe implements PipeTransform {
    transform(value: any, pointId: number) {
        return value.find(p => p.pointId === pointId) || { pointId: pointId, isDirty: false, updatedChoices: [], isSaving: false };
    }
}
