import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class LoadingService {
	readonly isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
	readonly isSaving$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
}
