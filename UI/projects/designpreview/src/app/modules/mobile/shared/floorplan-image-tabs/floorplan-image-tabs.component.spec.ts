import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { instance, mock } from 'ts-mockito';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable } from 'rxjs';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';

import { DialogService } from '../../../core/services/dialog.service';
import { FloorPlanImage, SubGroup } from 'phd-common';
import { FloorplanImageTabsComponent } from './floorplan-image-tabs.component';

import * as fromPlan from '../../../ngrx-store/plan/reducer';
import {
	findElementByTestId,
	findAllElementsByRole,
	findAllElementsByTestId,
} from '../../../shared/classes/test-utils.class';
import { testTreeVersion } from '../../../shared/classes/mockdata.class';

@Component({ selector: 'floor-plan', template: '' })
class FloorplanStubComponent 
{
	@Input() height: string = '100%';
	@Input() planId$: Observable<number>;
	@Input() selectedFloor;
	@Input() subGroup: SubGroup;
	@Input() ifpID: string = 'av-floor-plan';
	@Input() isFlipped: boolean;
}

describe('FloorplanImageTabsComponent', () => 
{
	let component: FloorplanImageTabsComponent;
	let fixture: ComponentFixture<FloorplanImageTabsComponent>;

	const initialState = {
		plan: fromPlan.initialState,
		scenario: {tree: { treeVersion: testTreeVersion }},
	};

	let instanceDialogService: DialogService;
	const mockDialogService = mock(DialogService);

	const testFloorPlanImages: FloorPlanImage[] = [
		{ floorIndex: 0, floorName: 'Floor 1', svg: 'svg1' },
		{ floorIndex: 1, floorName: 'Floor 2', svg: 'svg2' },
	];

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [FloorplanImageTabsComponent, FloorplanStubComponent],
			imports: [MatTabsModule, MatIconModule],
			providers: [
				provideMockStore({ initialState }),
				provideAnimations(),
				{
					provide: DialogService,
					useFactory: () => instance(mockDialogService),
				},
			],
		}).compileComponents();

		instanceDialogService = TestBed.inject(DialogService);

		fixture = TestBed.createComponent(FloorplanImageTabsComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	describe('Multiple Floorplans', () => 
	{
		beforeEach(() => 
		{
			component.floorPlanImages = testFloorPlanImages;
			fixture.detectChanges();
		});
		it('shows a tab for each floor', () => 
		{
			const floorPlanTabs = findAllElementsByRole(fixture, 'tab');
			expect(floorPlanTabs.length).toBe(2);
			expect(floorPlanTabs[0].nativeElement.innerText).toBe(
				testFloorPlanImages[0].floorName
			);
			expect(floorPlanTabs[1].nativeElement.innerText).toBe(
				testFloorPlanImages[1].floorName
			);
		});

		it('shows expands icons when showExpandImageIcons = true for multiple floorplans', () => 
		{
			component.showExpandImageIcons = true;
			fixture.detectChanges();
			expect(
				findElementByTestId(fixture, 'expand-image-icon-tabs')
			).toBeTruthy();
		});

		it('hides expand icons when showExpandImageIcons = false for multiple floorplans', () => 
		{
			component.showExpandImageIcons = false;
			fixture.detectChanges();
			expect(
				findElementByTestId(fixture, 'expand-image-icon-tabs')
			).toBeFalsy();
		});

		it(
			'calls dialogService.openImageDialog() when expand icon is clicked with correct selected index',
			waitForAsync(() => 
			{
				const dialogSpy = spyOn(
					instanceDialogService,
					'openImageDialog'
				);
				component.showExpandImageIcons = true;
				fixture.detectChanges();
				const secondTab = findAllElementsByRole(fixture, 'tab')[1];
				secondTab.nativeElement.click();
				fixture.detectChanges();

				fixture.whenStable().then(() => 
				{
					const expandImageButton = findAllElementsByTestId(
						fixture,
						'expand-image-icon-tabs'
					)[1];
					expandImageButton.nativeElement.click();
					fixture.detectChanges();
					expect(dialogSpy).toHaveBeenCalledWith({
						selectedIndex: 1,
					});
				});
			}),
			10000
		);

		it('shows border around image when showImageContainerBorder = true', () => 
		{
			component.showImageContainerBorder = true;
			fixture.detectChanges();
			const imageContainer = findElementByTestId(
				fixture,
				'image-container-tabs'
			);
			expect(
				imageContainer.classes['phd-floorplan-image-container']
			).toBeTruthy();
		});

		it('hides border around image when showImageContainerBorder = false', () => 
		{
			component.showImageContainerBorder = false;
			fixture.detectChanges();
			const imageContainer = findElementByTestId(
				fixture,
				'image-container-tabs'
			);
			expect(
				imageContainer.classes['phd-floorplan-image-container']
			).toBeFalsy();
		});
	});

	describe('Single Floorplan', () => 
	{
		beforeEach(() => 
		{
			component.floorPlanImages = [testFloorPlanImages[0]];
			fixture.detectChanges();
		});
		
		it('shows single floorplan image container if there is only one floor', () => 
		{
			const singleFloorplanImageContainer = findElementByTestId(
				fixture,
				'single-floorplan-image-container'
			);
			expect(singleFloorplanImageContainer).toBeTruthy();
			expect(
				findAllElementsByTestId(fixture, 'floorplan-tab').length
			).toBe(0);
		});

		it('shows expands icons when showExpandImageIcons = true for single floorplan', () => 
		{
			component.showExpandImageIcons = true;
			fixture.detectChanges();
			expect(
				findElementByTestId(fixture, 'expand-image-icon-single')
			).toBeTruthy();
		});

		it('hides expand icons when showExpandImageIcons = false for single floorplan', () => 
		{
			component.showExpandImageIcons = false;
			fixture.detectChanges();
			expect(
				findElementByTestId(fixture, 'expand-image-icon-single')
			).toBeFalsy();
		});

		it('calls dialogService.openImageDialog() when expand icon is clicked', () => 
		{
			const dialogSpy = spyOn(instanceDialogService, 'openImageDialog');
			component.showExpandImageIcons = true;
			fixture.detectChanges();
			const expandImageButton = findElementByTestId(
				fixture,
				'expand-image-icon-single'
			);
			expandImageButton.nativeElement.click();
			expect(dialogSpy).toHaveBeenCalledWith({ selectedIndex: 0 });
		});

		it('shows border around image when showImageContainerBorder = true', () => 
		{
			component.showImageContainerBorder = true;
			fixture.detectChanges();
			const imageContainer = findElementByTestId(
				fixture,
				'single-floorplan-image-container'
			);
			expect(
				imageContainer.classes['phd-floorplan-image-container']
			).toBeTruthy();
		});

		it('hides border around image when showImageContainerBorder = false', () => 
		{
			component.showImageContainerBorder = false;
			fixture.detectChanges();
			const imageContainer = findElementByTestId(
				fixture,
				'single-floorplan-image-container'
			);
			expect(
				imageContainer.classes['phd-floorplan-image-container']
			).toBeFalsy();
		});
	});
});
