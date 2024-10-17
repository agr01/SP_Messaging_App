// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)
import { TestBed } from '@angular/core/testing';

import { RecipientService } from './recipient.service';

describe('RecipientService', () => {
  let service: RecipientService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecipientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
