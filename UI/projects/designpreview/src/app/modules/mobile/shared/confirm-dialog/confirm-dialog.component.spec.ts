import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => 
{
	let component: ConfirmDialogComponent;
	let fixture: ComponentFixture<ConfirmDialogComponent>;

	beforeEach(async () => 
	{
		await TestBed.configureTestingModule({
			declarations: [ ConfirmDialogComponent ],
			imports: [ MatDialogModule ],
			providers: [
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: {} }
			]
		})
			.compileComponents();

		fixture = TestBed.createComponent(ConfirmDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => 
	{
		expect(component).toBeTruthy();
	});
});
