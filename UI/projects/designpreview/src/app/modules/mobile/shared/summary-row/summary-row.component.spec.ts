import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SummaryRowComponent } from './summary-row.component';
import { dpToDpRulesPoint } from '../../../shared/classes/mockdata.class';

describe('SummaryRowComponent', () =>
{
	let component: SummaryRowComponent;
	let fixture: ComponentFixture<SummaryRowComponent>;

	beforeEach(async () =>
	{
		await TestBed.configureTestingModule({
			declarations: [SummaryRowComponent]
		})
			.compileComponents();

		fixture = TestBed.createComponent(SummaryRowComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should display the dp label', () =>
	{

		component.decisionPoint = dpToDpRulesPoint;
		fixture.detectChanges();

		const element = fixture.debugElement.nativeElement;
		expect(element.querySelector('.phd-fav-row-container').textContent).toContain('Smart Home Additions');
	});


	it('should create', () =>
	{
		expect(component).toBeTruthy();
	});
});
