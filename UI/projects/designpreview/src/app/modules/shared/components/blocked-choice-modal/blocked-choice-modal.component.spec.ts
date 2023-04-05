import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { Observable, of } from 'rxjs';
import { instance, mock } from 'ts-mockito';

import { BlockedChoiceModalComponent } from './blocked-choice-modal.component';
import { choiceToChoiceMustHaveRuleChoice, choiceToChoiceMustHaveRulePoint, choiceToChoiceMustNotHaveRuleChoice, choiceToChoiceMustNotHaveRulePoint, dpToDpRulesPoint } from '../../classes/mockdata.class';
import { AdobeService } from '../../../core/services/adobe.service';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

describe('BlockedChoiceModalComponent', () => 
{
	let component: BlockedChoiceModalComponent;
	let fixture: ComponentFixture<BlockedChoiceModalComponent>;
	let mockStore: MockStore;
	let router: Router;

	const initialState = {
		scenario: fromScenario.initialState
	};
	const mustHaveHeaderText = 'Before this can be selected';
	const mustNotHaveHeaderText = 'Disabled due to';

	const mockAdobeService = mock(AdobeService);

	beforeEach(fakeAsync(() => 
	{
		TestBed.configureTestingModule({
			declarations: [
				BlockedChoiceModalComponent,
				MockChoicePipe,
				MockPointPipe
			],
			imports: [RouterTestingModule],
			providers: [
				provideMockStore({ initialState }),
				{ provide: AdobeService, useFactory: () => instance(mockAdobeService) }
			]
		})
			.compileComponents();

		mockStore = TestBed.inject(MockStore);
		router = TestBed.inject(Router);
	}));

	beforeEach(() => 
	{
		fixture = TestBed.createComponent(BlockedChoiceModalComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	it('dp to dp must have messaging is correct', () =>
	{
		// Data set up
		component.point = dpToDpRulesPoint;
		component.setErrors();
		component.filterErrorRules();
		fixture.detectChanges();

		// Header messaging must have
		const header = fixture.debugElement.nativeElement.querySelector('#blockedChoiceHeader');
		expect(header.textContent.trim()).toBe(mustHaveHeaderText);

		// Modal content
		const listItem = fixture.debugElement.nativeElement.querySelector('#li-233821');
		expect(listItem.textContent.trim()).toBe('Make a POINT selection');
	});

	it('choice to choice must have messaging is correct', () =>
	{
		// Data set up
		component.points = [choiceToChoiceMustHaveRulePoint];
		component.point = choiceToChoiceMustHaveRulePoint;
		component.choice = choiceToChoiceMustHaveRuleChoice;
		component.setErrors();
		component.filterErrorRules();
		fixture.detectChanges();

		// Header messaging must have
		const header = fixture.debugElement.nativeElement.querySelector('#blockedChoiceHeader');
		expect(header.textContent.trim()).toBe(mustHaveHeaderText);

		// Modal content
		const listItem = fixture.debugElement.nativeElement.querySelector('#li-791986');
		expect(listItem.textContent.trim()).toBe('Select CHOICE');
	});

	it('choice to choice must NOT have messaging is correct', () =>
	{
		// Data set up
		component.points = [choiceToChoiceMustNotHaveRulePoint];
		component.point = choiceToChoiceMustNotHaveRulePoint;
		component.choice = choiceToChoiceMustNotHaveRuleChoice;
		component.setErrors();
		component.filterErrorRules();
		fixture.detectChanges();

		// Header messaging must have
		const header = fixture.debugElement.nativeElement.querySelector('#blockedChoiceHeader');
		expect(header.textContent.trim()).toBe(mustNotHaveHeaderText);

		// Modal content
		const listItem = fixture.debugElement.nativeElement.querySelector('#li-791985');
		expect(listItem.textContent.trim()).toBe('CHOICE selection');
	});
});

// Mock Points to assist with testing
@Pipe({name: 'pointIdToName'})
class MockPointPipe implements PipeTransform
{
	transform(value: number): Observable<string>
	{
		return of('POINT');
	}
}

@Pipe({name: 'choiceIdToName'})
class MockChoicePipe implements PipeTransform
{
	transform(value: number): Observable<string>
	{
		return of('CHOICE');
	}
}