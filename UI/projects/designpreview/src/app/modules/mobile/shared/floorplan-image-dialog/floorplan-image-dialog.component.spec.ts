import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { findElementByTestId } from '../../../shared/classes/test-utils.class';
import { FloorplanImageDialogComponent } from './floorplan-image-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { FloorplanImageTabsStubComponent } from '../../../shared/mocks/mock-floorplan-image-tabs';

describe('FloorplanImageDialogComponent', () => 
{
	let component: FloorplanImageDialogComponent;
	let fixture: ComponentFixture<FloorplanImageDialogComponent>;

	let matDialogRef;

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [FloorplanImageDialogComponent, FloorplanImageTabsStubComponent],
			imports: [MatIconModule],
			providers: [
				{
					provide: MAT_DIALOG_DATA,
					useValue: { data: { selectedIndex: 0 } },
				},
				{
					provide: MatDialogRef,
					useFactory: () =>
						jasmine.createSpyObj('MatDialogRef', ['close']),
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(FloorplanImageDialogComponent);
		component = fixture.componentInstance;
		matDialogRef = TestBed.inject(MatDialogRef);
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});

	it('has close button', () => 
	{
		const closeButton = findElementByTestId(fixture, 'close-btn');
		expect(closeButton).toBeTruthy();
	});

	it('calls close() of matDialogRef when close button is clicked', () => 
	{
		const closeButton = findElementByTestId(fixture, 'close-btn');
		closeButton.nativeElement.click();
		expect(matDialogRef.close).toHaveBeenCalled();
	});
});
