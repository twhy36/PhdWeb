import { Injectable } from '@angular/core';
import {ReplaySubject} from 'rxjs';

@Injectable()
export class ColorAdminService {

	private editingColorSource = new ReplaySubject<boolean>(1);
	editingColor$ = this.editingColorSource.asObservable();

	emitEditingColor(isVisible: boolean) {
		this.editingColorSource.next(isVisible);
	}
}
