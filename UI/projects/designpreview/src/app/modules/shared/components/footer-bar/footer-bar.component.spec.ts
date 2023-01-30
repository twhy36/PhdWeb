import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandService } from '../../../core/services/brand.service';
import { instance, mock } from 'ts-mockito';

import { FooterBarComponent } from './footer-bar.component';

describe('FooterBarComponent', () =>
{
	let component: FooterBarComponent;
	let fixture: ComponentFixture<FooterBarComponent>;

	beforeEach(async () =>
	{
		await TestBed.configureTestingModule({
			declarations: [FooterBarComponent],
			providers: [
				{ provide: BrandService, useFactory: () => instance(mockBrandService) },
			]
		})
			.compileComponents();
	});

	const mockBrandService = mock(BrandService);

	beforeEach(() =>
	{
		fixture = TestBed.createComponent(FooterBarComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () =>
	{
		expect(component).toBeTruthy();
	});
});

