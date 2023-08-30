import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromApp from '../../../ngrx-store/app/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromOrg from '../../../ngrx-store/org/reducer';
import * as fromJob from '../../../ngrx-store/job/reducer';
import * as fromChangeOrder from '../../../ngrx-store/change-order/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

import { GroupListComponent } from './group-list.component';
import { OptionsComponent } from '../../options/options.component';
import { testTreeVersion } from '../../../shared/classes/mockdata.class';
import { findElementByTestId } from '../../../shared/classes/test-utils.class';

describe('GroupListComponent', () => 
{
	let component: GroupListComponent;
	let fixture: ComponentFixture<GroupListComponent>;
	let mockStore: MockStore;
	let router: Router;

	const initialState = {
		app: fromApp.initialState,
		salesAgreement: fromSalesAgreement.initialState,
		plan: fromPlan.initialState,
		org: fromOrg.initialState,
		job: fromJob.initialState,
		changeOrder: fromChangeOrder.initialState,
		scenario: fromScenario.initialState
	};

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [ GroupListComponent ],
			imports: [
				BrowserAnimationsModule,
				RouterTestingModule.withRoutes([
					{
						path: 'options/:subGroupId/:decisionPointId',
						component: OptionsComponent
					}
				]),
				MatIconModule,
				MatListModule,
				MatMenuModule
			],
			providers: [ provideMockStore({ initialState }) ]
		})
			.compileComponents();

		mockStore = TestBed.inject(MockStore);
		router = TestBed.inject(Router);

		mockStore.overrideSelector(fromRoot.filteredTree, testTreeVersion);

		fixture = TestBed.createComponent(GroupListComponent);
		component = fixture.componentInstance;
		component.selectedSubGroupId = 3;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	it('only one subgroup is active', () =>
	{
		expect(component.groups.length).toBeGreaterThan(0);
		let activeCount = 0;
		let inactiveCount = 0;
		component.groups.forEach(g =>
		{
			if (component.isGroupActive(g))
			{
				activeCount++;
			}
			else
			{
				inactiveCount++
			}
		});
		expect(activeCount).toBe(1);
		expect(inactiveCount + activeCount).toBe(component.groups.length);
	});

	it('expansion icon is oriented correctly', () =>
	{
		const expandIcon = findElementByTestId(fixture, 'expand-icon');

		expect(expandIcon.nativeElement.innerText).toBe('expand_more');

		const buttonLink = findElementByTestId(fixture, 'group-button');
		buttonLink.nativeElement.click();
		fixture.detectChanges();

		expect(expandIcon.nativeElement.innerText).toBe('expand_less');
	});

	it('navigates to selected subgroup', () =>
	{
		const navigateSpy = spyOn(router, 'navigateByUrl');

		const buttonLink = findElementByTestId(fixture, 'group-button');
		buttonLink.nativeElement.click();
		const subGroupLink = findElementByTestId(fixture, 'subgroup-link');
		subGroupLink.nativeElement.click();

		const url = navigateSpy.calls.first().args[0].toString();
		expect(url).toBe('/options/3/888218')
	});
});
