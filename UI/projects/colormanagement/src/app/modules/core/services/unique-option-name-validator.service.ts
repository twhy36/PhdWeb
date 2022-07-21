import { Injectable } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { OptionPackageService } from './option-packages.service';

@Injectable({
	providedIn: 'root'
})
export class UniqueOptionNameValidatorService {

	static createValidator(communityId: number, optionPackageService: OptionPackageService): AsyncValidatorFn {
		return (control: AbstractControl): Observable<ValidationErrors> => {
			return optionPackageService.isOptionNameTaken(control.value, communityId).pipe(
				map((isTaken: boolean) => (isTaken ? { duplicate: control.value } : null)),
				catchError(() => of(null))
			);
		}
	}
}
