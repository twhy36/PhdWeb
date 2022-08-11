import { Injectable } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, debounceTime } from 'rxjs/operators';
import { OptionPackageService } from './option-packages.service';

@Injectable({
	providedIn: 'root'
})
export class UniqueOptionNameValidatorService {

	/**
	 * Use for asyncValidator 
	 */
	static createValidator(communityId: number, optionPackageService: OptionPackageService): AsyncValidatorFn {
		return (control: AbstractControl): Observable<ValidationErrors> => {
			return control.valueChanges.pipe(
				debounceTime(300),
				switchMap(() => { 
				return UniqueOptionNameValidatorService.validate(optionPackageService, control, communityId);
			} ))
		}
	}

	/**
	 * Use for manual calls (when async validator stops reactive forms submit)
	 * @see https://github.com/angular/angular/issues/31021
	 */
	static validate(optionPackageService: OptionPackageService, control: AbstractControl, communityId: number): Observable<any> {
		return optionPackageService.isOptionNameTaken(control.value, communityId).pipe(
			map((isTaken: boolean) => (isTaken ? { duplicate: control.value } : null)),
			catchError(() => of(null))
		);
	}
}
