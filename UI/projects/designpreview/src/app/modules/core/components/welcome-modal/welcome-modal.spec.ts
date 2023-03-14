import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { WelcomeModalComponent } from './welcome-modal.component';
import * as fromApp from '../../../ngrx-store/app/reducer';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

describe('WelcomeModalComponent', () => 
{
	let component: WelcomeModalComponent;
	let fixture: ComponentFixture<WelcomeModalComponent>;

	let mockStore: MockStore;
	const { initialState } = fromApp;

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [ WelcomeModalComponent ],
			providers: [ NgbModal, NgbActiveModal, provideMockStore({ initialState }), ]
		})
			.compileComponents();

		mockStore = TestBed.inject(MockStore);
	});

	beforeEach(() => 
	{
		fixture = TestBed.createComponent(WelcomeModalComponent);
		component = fixture.componentInstance;

		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	it('should return the default state', () => 
	{
		const state = fromApp.reducer(undefined, { type: null });

		expect(state.welcomeAcknowledged).toBe(initialState.welcomeAcknowledged);
	})
});
