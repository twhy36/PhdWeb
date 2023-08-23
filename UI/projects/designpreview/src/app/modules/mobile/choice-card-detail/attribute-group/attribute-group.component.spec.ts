import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttributeGroupComponent } from './attribute-group.component';
import { ChangeDetectorRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AdobeService } from '../../../core/services/adobe.service';
import { instance, mock } from 'ts-mockito';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { MatExpansionModule } from '@angular/material/expansion';
import { AttributeService } from '../../../core/services/attribute.service';
import { testUpdatedChoiceAttributeGroups } from '../../../shared/classes/mockdata.class';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MockCloudinaryImage } from '../../../shared/mock-components/mock-cloudinary-image';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MatIconModule } from '@angular/material/icon';
import { findElementByTestId, findAllElementByTestId } from '../../../shared/classes/test-utils.class';

describe('AttributeGroupComponent', () =>
{
	let component: AttributeGroupComponent;
	let fixture: ComponentFixture<AttributeGroupComponent>;
	let mockStore: MockStore;
	const initialState = {
		scenario: fromScenario.initialState
	};

	const mockChangeDetectorRef = mock(ChangeDetectorRef);
	const mockToastrService = mock(ToastrService);
	const mockAdobeService = mock(AdobeService);
	const mockAttributeService = mock(AttributeService);

	beforeEach(async () =>
	{
		await TestBed.configureTestingModule({
			declarations: [AttributeGroupComponent, MockCloudinaryImage],
			imports: [
				BrowserAnimationsModule,
				MatExpansionModule,
				NgbModule,
				MatIconModule
			],
			providers: [
				provideMockStore({ initialState }),
				{ provide: ChangeDetectorRef, useFactory: () => instance(mockChangeDetectorRef) },
				{ provide: ToastrService, useFactory: () => instance(mockToastrService) },
				{ provide: AdobeService, useFactory: () => instance(mockAdobeService) },
				{ provide: AttributeService, useFactory: () => instance(mockAttributeService) },
			]
		})
			.compileComponents();
		mockStore = TestBed.inject(MockStore);

		fixture = TestBed.createComponent(AttributeGroupComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () =>
	{
		expect(component).toBeTruthy();
	});

	it('should initialize updatedAttributeGroups arrays', () =>
	{
		expect(component.updatedAttributeGroups).toBeDefined();
	});

	it('should display accordion items for each attribute group', () =>
	{
		component.updatedAttributeGroups = testUpdatedChoiceAttributeGroups;
		component.hasAttributes = true;
		fixture.detectChanges();
		const numAttributeGroups = component.updatedAttributeGroups.length;	
		const groupPanels = findAllElementByTestId(
			fixture,
			'attribute-group-panel'
		);
		expect(groupPanels.length).toEqual(numAttributeGroups);
	});

	it('should display attribute group name in accordion header', () =>
	{
		component.updatedAttributeGroups = testUpdatedChoiceAttributeGroups;
		const groupPanels = findAllElementByTestId(
			fixture,
			'attribute-group-panel'
		);
		component.hasAttributes = true;
		fixture.detectChanges();

		groupPanels.forEach((item, index) =>
		{
			const header = item.querySelector('.mat-expansion-panel-header');
			const groupName = header.querySelector('.mat-expansion-panel-header-title').textContent;
			expect(groupName).toContain(testUpdatedChoiceAttributeGroups[index].label);
		});
	});

	it('should display attributes within each accordion item', () =>
	{
		component.updatedAttributeGroups = testUpdatedChoiceAttributeGroups;
		component.hasAttributes = true;
		fixture.detectChanges();

		const attributeElements = fixture.nativeElement.querySelectorAll('.phd-attribute-item');
		expect(attributeElements.length).toEqual(11);
	});

	it('should init to expand and collapse/expand accordion items', () =>
	{
		component.updatedAttributeGroups = testUpdatedChoiceAttributeGroups;
		component.hasAttributes = true;
		fixture.detectChanges();

		const expansionPanels = fixture.nativeElement.querySelectorAll('mat-expansion-panel');
		const header = expansionPanels[0].querySelector('.mat-expansion-panel-header');

		// Simulate clicking to expand
		header.click();
		component.panelStates[0] = false;
		fixture.detectChanges();
		expect(expansionPanels[0].classList).not.toContain('mat-expanded');

		// Simulate clicking to collapse
		header.click();
		component.panelStates[0] = true;
		fixture.detectChanges();
		expect(expansionPanels[0].classList).toContain('mat-expanded');
	});

});
