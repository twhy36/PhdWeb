import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from 'phd-common';
import { first } from 'rxjs/operators';
import { instance, mock } from 'ts-mockito';
import { AdobeService } from '../../../core/services/adobe.service';
import { BrandService } from '../../../core/services/brand.service';
import { choiceToChoiceMustHaveRuleChoice } from '../../classes/mockdata.class';
import { AttributeLocationComponent } from './attribute-location.component';

describe('AttributeLocationComponent', () =>
{
	let component: AttributeLocationComponent;
	let fixture: ComponentFixture<AttributeLocationComponent>;
	const mockModalService = mock(ModalService);
	const mockAdobeService = mock(AdobeService);
	const mockBrandService = mock(BrandService);
	let instanceModalService;
	let instanceAdobeService;

	beforeEach(async () =>
	{
		TestBed.configureTestingModule({
			declarations: [AttributeLocationComponent],
			providers: [
				{ provide: ModalService, useFactory: () => instance(mockModalService) },
				{ provide: AdobeService, useFactory: () => instance(mockAdobeService) },
				{ provide: BrandService, useFactory: () => instance(mockBrandService) },
			],
		}).compileComponents();

		instanceModalService = TestBed.inject(ModalService);
		instanceAdobeService = TestBed.inject(AdobeService);
	});

	beforeEach(() =>
	{
		fixture = TestBed.createComponent(AttributeLocationComponent);
		component = fixture.componentInstance;

		component.choice = choiceToChoiceMustHaveRuleChoice;
		component.currentChoice = choiceToChoiceMustHaveRuleChoice;
		component.attributeLocation = { id: 1, name: 'Location 1' };
		fixture.detectChanges();
	});

	describe('quantityChangeHandler', () =>
	{
		it('emits location information when the handler receives non-null value', () =>
		{
			spyOn(instanceModalService, 'open').and.callThrough();
			component.quantityChange.pipe(first()).subscribe((data) => 
			{
				expect(data.quantity).toBe(7);
			});
			component.quantityChangeHandler(7);
			expect(component.locationQuantityTotal).toBe(7);
			expect(instanceModalService.open).not.toHaveBeenCalled();
		});

		it('opens the max quantity modal when the handler receives null', () =>
		{
			spyOn(instanceModalService, 'open').and.callThrough();
			spyOn(instanceAdobeService, 'setAlertEvent').and.callThrough();
			component.quantityChangeHandler(null);
			expect(instanceModalService.open).toHaveBeenCalled();
			expect(instanceAdobeService.setAlertEvent).toHaveBeenCalled();
		});
	});
});
