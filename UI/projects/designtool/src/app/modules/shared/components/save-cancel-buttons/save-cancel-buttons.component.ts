import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import { FormGroup } from '@angular/forms';

import { UnsubscribeOnDestroy } from 'phd-common';

@Component( {
	selector: 'save-cancel-buttons',
	templateUrl: './save-cancel-buttons.component.html',
	styleUrls: ['./save-cancel-buttons.component.scss']
} )

export class SaveCancelButtonsComponent extends UnsubscribeOnDestroy implements OnInit {

	@Input() saveText: string = 'save';
	@Input() savingText: string = 'saving...';
	@Input() savedText: string = 'saved';
	@Input() errorText: string = 'error';
	@Input() cancelText: string = 'cancel';
	@Input() fromState: string = 'salesAgreement';
	@Input() unsavedProp: string = 'isUnsaved';
	@Input() errorProp: string = 'saveError';
	@Input() form: FormGroup;

	@Output() onSave = new EventEmitter<void>();
	@Output() onCancel = new EventEmitter<void>();

	// Observables/Subscribers for listening for changes to the save state.
	// Only subscribed between clicking the Save button and getting results.
	state$: Observable<any>;
	sub: Subscription;

	buttonText: string;
	deleting: boolean = false;

	constructor( private store: Store<fromRoot.State> ) {
		super();
	}

	ngOnInit() {
		this.buttonText = this.saveText;
		// Create Observable, but don't subscribe yet.
		this.state$ = this.store.pipe( this.takeUntilDestroyed(), select( state => state[this.fromState] ) );
	}

	save() {
		// Emit the save now, so it resets all "listener" properties in the state
		this.onSave.emit();

		this.sub = this.state$.subscribe( agreement => {
			const unsaved = agreement[this.unsavedProp];
			const error = agreement[this.errorProp];
			this.buttonText = this.savingText;
			if ( unsaved && error ) {
				this.buttonText = this.errorText;
				setTimeout( ( { } ) => this.resetButton(), 3000 );
			} else if ( !unsaved && !error ) {
				this.buttonText = this.savedText;
				setTimeout( ( { } ) => this.resetButton(), 3000 );
			}
		} );
	}

	cancel() {
		this.onCancel.emit();
	}

	resetButton() {
		this.sub.unsubscribe();
		this.buttonText = this.saveText;
	}

	formIsValid() {
		return this.form && this.form.valid;
	}
}
