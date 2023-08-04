import { DebugElement } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

export function findElementByTestId<T>(
	fixture: ComponentFixture<T>,
	testId: string
): DebugElement 
{
	return fixture.debugElement.query(By.css(`[data-testid='${testId}']`));
}
