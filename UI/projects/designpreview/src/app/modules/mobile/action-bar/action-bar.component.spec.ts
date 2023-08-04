import { ActivatedRoute, Router } from '@angular/router';
import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Location } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { SpyLocation } from '@angular/common/testing';

import { of } from 'rxjs';

import { ActionBarComponent } from './action-bar.component';
import { ChoiceCardDetailComponent } from '../choice-card-detail/choice-card-detail.component';
import { findElementByTestId } from '../../shared/classes/test-utils.class';

@Component({
	template: ''
	})
class DummyComponent { }

describe('ActionBarComponent', () => 
{
	let component: ActionBarComponent;
	let fixture: ComponentFixture<ActionBarComponent>;
	let location: Location;
	let router: Router;

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [ActionBarComponent, ChoiceCardDetailComponent, DummyComponent],
			imports: [RouterTestingModule.withRoutes([
				{ path: 'options/:subGroupCatalogId/:decisionPointCatalogId', component: DummyComponent },
				{ path: 'options/:subGroupCatalogId/:decisionPointCatalogId/:choiceCatalogId', component: ChoiceCardDetailComponent }
			])],
			providers: [{ provide: Location, useClass: SpyLocation }, { provide: ActivatedRoute, useValue: { params: of({ subGroupCatalogId: 1, decisionPointCatalogId: 2, choiceCatalogId: 3 }) } }],
		}).compileComponents();

		location = TestBed.inject(Location);
		router = TestBed.inject(Router);

		fixture = TestBed.createComponent(ActionBarComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();

		router.initialNavigation();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	describe('rendering buttons', () =>
	{
		it('hides back button when showBack = false', () =>
		{
			const backButton = findElementByTestId(fixture, 'back-btn');
			expect(backButton).toBeFalsy();
		})

		it('shows back button when showBack = true', () =>
		{
			component.showBack = true;
			fixture.detectChanges();
			const backButton = findElementByTestId(fixture, 'back-btn');
			expect(backButton).toBeTruthy();
		})
	});

	// Test is not working with relative routes, leave code to look into later
	xit('navigates back', fakeAsync(() => 
	{
		router.navigateByUrl('/options/1/2/3')
		component.showBack = true;
		fixture.detectChanges();
		const backButton = findElementByTestId(fixture, 'back-btn');
		backButton.nativeElement.click();
		advance();
		expect(location.path()).toEqual('/options/1/2')
	}));

	function advance(): void 
	{
		tick();
		fixture.detectChanges();
	}
});
