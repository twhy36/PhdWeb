import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  MatButtonModule,
  MatToolbarModule, 
  MatFormFieldModule, 
  MatSelectModule, 
  MatProgressSpinnerModule,
  MatListModule,
  MatIconModule,
  MatExpansionModule
 } from '@angular/material';

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule
  ],
  exports: [
    MatButtonModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule
  ],
  declarations: []
})
export class MaterialModule { }