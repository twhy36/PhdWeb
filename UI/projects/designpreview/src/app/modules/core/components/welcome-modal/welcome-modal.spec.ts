import { ComponentFixture, TestBed, tick } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { WelcomeModalComponent } from './welcome-modal.component';
import * as fromApp from '../../../ngrx-store/app/reducer';
import * as fromChangeOrder from '../../../ngrx-store/change-order/reducer';
import * as fromJob from '../../../ngrx-store/job/reducer';
import * as fromOrg from '../../../ngrx-store/org/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { ModalRef } from 'phd-common';
import * as AppActions from '../../../ngrx-store/app/actions';
import { By } from '@angular/platform-browser';

describe('WelcomeModalComponent', () => 
{
	let component: WelcomeModalComponent;
	let fixture: ComponentFixture<WelcomeModalComponent>;

	let mockStore: MockStore;
	const initialState = {
		app: fromApp.initialState,
		salesAgreement: fromSalesAgreement.initialState,
		plan: fromPlan.initialState,
		org: fromOrg.initialState,
		job: fromJob.initialState,
		changeOrder: fromChangeOrder.initialState,
		scenario: fromScenario.initialState,
	};
	const mockModalRef = {
		close: () => {},
		_modalRef: ModalRef,
		dismiss: () => {},
		result: () => {},
		componentInstance: WelcomeModalComponent,
	};

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [WelcomeModalComponent],
			providers: [
				NgbModal,
				NgbActiveModal,
				provideMockStore({ initialState }),
			],
		}).compileComponents();

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
		const state = fromApp.reducer(undefined, {
			type: null,
		});

		expect(state.welcomeAcknowledged).toBe(
			initialState.app.welcomeAcknowledged
		);
	});

	describe('modal content', () => 
	{
		it('should display correct context text if not presale', () => 
		{
			mockStore.setState({
				...initialState,
				scenario: {
					buildMode: BuildMode.Buyer,
					presalePricingEnabled: false,
				},
			});
			fixture.detectChanges();
			const headerText = fixture.debugElement.query(
				By.css('h1')
			).nativeElement;
			const subTextOne = fixture.debugElement.queryAll(By.css('li'))[0]
				.nativeElement;
			const subTextTwo = fixture.debugElement.queryAll(By.css('li'))[1]
				.nativeElement;
			const messageDisclaimer = fixture.debugElement.query(
				By.css('.phd-message-disclaimer')
			).nativeElement;

			expect(headerText.textContent).not.toContain('future');
			expect(subTextOne.textContent).toContain('your home');
			expect(subTextTwo.textContent).toEqual(
				'Reach out to your Sales Consultant to discuss your options and learn more.'
			);
			expect(messageDisclaimer.textContent).toContain(
				'You may change your Favorites'
			);
		});

		it('should display correct content text for presale with pricing enabled', () => 
		{
			mockStore.setState({
				...initialState,
				scenario: {
					buildMode: BuildMode.Presale,
					presalePricingEnabled: true,
				},
			});
			fixture.detectChanges();
			const headerText = fixture.debugElement.query(
				By.css('h1')
			).nativeElement;
			const subTextOne = fixture.debugElement.queryAll(By.css('li'))[0]
				.nativeElement;
			const subTextTwo = fixture.debugElement.queryAll(By.css('li'))[1]
				.nativeElement;
			const messageDisclaimer = fixture.debugElement.query(
				By.css('.phd-message-disclaimer')
			).nativeElement;

			expect(headerText.textContent).toContain('future');
			expect(subTextOne.textContent).toContain('this home');
			expect(subTextTwo.textContent).toEqual(
				'Reach out to your Sales Consultant to discuss your options and learn more.'
			);
			expect(messageDisclaimer.textContent).toContain(
				'Options and pricing'
			);
		});

		it('should display correct content text for presale without pricing enabled', () => 
		{
			mockStore.setState({
				...initialState,
				scenario: {
					buildMode: BuildMode.Presale,
					presalePricingEnabled: false,
				},
			});
			fixture.detectChanges();
			const headerText = fixture.debugElement.query(
				By.css('h1')
			).nativeElement;
			const subTextOne = fixture.debugElement.queryAll(By.css('li'))[0]
				.nativeElement;
			const subTextTwo = fixture.debugElement.queryAll(By.css('li'))[1]
				.nativeElement;
			const messageDisclaimer = fixture.debugElement.query(
				By.css('.phd-message-disclaimer')
			).nativeElement;

			expect(headerText.textContent).toContain('future');
			expect(subTextOne.textContent).toContain('this home');
			expect(subTextTwo.textContent).toEqual(
				'Reach out to your Sales Consultant to discuss your options and learn more.'
			);
			expect(messageDisclaimer.textContent).not.toContain('and pricing');
		});
	});

	describe('close popup', () => 
	{
		it('should dispatch acknowledge welcome action', () => 
		{
			const storeSpy = spyOn(mockStore, 'dispatch').and.callThrough();
			spyOnProperty(component, 'modalRef', 'get').and.returnValue(
				mockModalRef
			);
			spyOn(component.modalRef, 'close');

			const button =
				fixture.debugElement.nativeElement.querySelector('button');
			button.click();
			expect(storeSpy).toHaveBeenCalledTimes(2);
			expect(storeSpy).toHaveBeenCalledWith(
				new AppActions.AcknowledgeWelcome(true)
			);
			expect(storeSpy).toHaveBeenCalledWith(
				new AppActions.ShowWelcomeModal(false)
			);
			expect(component.modalRef.close).toHaveBeenCalled();
		});
	});
});
