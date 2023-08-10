import {
	ComponentFixture,
	TestBed,
	fakeAsync,
	tick,
} from '@angular/core/testing';
import { Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { DummyComponent } from '../../shared/mock-components/mock-dummy-component';
import { findElementByTestId } from '../../shared/classes/test-utils.class';
import { LandingComponent } from '../landing/landing.component';
import { ViewOptionsLinkComponent } from './view-options-link.component';

describe('ViewOptionsLinkComponent', () => 
{
	let component: ViewOptionsLinkComponent;
	let fixture: ComponentFixture<ViewOptionsLinkComponent>;

	let location: Location;
	let router: Router;

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [ViewOptionsLinkComponent],
			imports: [
				RouterTestingModule.withRoutes([
					{ path: 'home', component: LandingComponent },
					{ path: 'options', component: DummyComponent },
				]),
				MatIconModule,
			],
		}).compileComponents();

		location = TestBed.inject(Location);
		router = TestBed.inject(Router);

		fixture = TestBed.createComponent(ViewOptionsLinkComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	it('shows correct description for presale', () => 
	{
		component.isPresale = true;
		fixture.detectChanges();
		const description = findElementByTestId(fixture, 'description');
		expect(description.nativeElement.innerText).not.toContain(
			'and review them later'
		);
	});

	it('shows correct description for non-presale', () => 
	{
		component.isPresale = false;
		fixture.detectChanges();
		const description = findElementByTestId(fixture, 'description');
		expect(description.nativeElement.innerText).toContain(
			'and review them later'
		);
	});

	it('navigates to options when View Options button is clicked', fakeAsync(() => 
	{
		router.navigateByUrl('home');
		const viewOptionsButton = findElementByTestId(
			fixture,
			'view-options-btn'
		);
		viewOptionsButton.nativeElement.click();
		tick();
		expect(location.path()).toBe('/options');
	}));
});
