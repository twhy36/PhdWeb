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

export function findAllElementByTestId<T>(
	fixture: ComponentFixture<T>,
	testId: string
  ): HTMLElement[] {
	return fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`);
  }
