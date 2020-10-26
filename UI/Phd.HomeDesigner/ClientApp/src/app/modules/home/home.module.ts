import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CloudinaryModule } from '@cloudinary/angular-5.x';

import { SharedModule } from '../shared/shared.module';
import { HomeComponent } from './components/home/home.component';

const moduleRoutes: Routes = [
    { path: '', component: HomeComponent }
];

@NgModule({
    exports: [
        HomeComponent
    ],
    declarations: [
        HomeComponent
    ],  
	imports: [
		CloudinaryModule,
        SharedModule,
        RouterModule.forChild(moduleRoutes),
    ],
    providers: []
})
export class HomeModule { }
