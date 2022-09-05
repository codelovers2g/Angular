import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketsDisplayComponent } from './tickets-display.component';

describe('TicketsDisplayComponent', () => {
  let component: TicketsDisplayComponent;
  let fixture: ComponentFixture<TicketsDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TicketsDisplayComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TicketsDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
