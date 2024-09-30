import { TestBed } from '@angular/core/testing';

import { RecipientService } from './client.service';

describe('ClientService', () => {
  let service: RecipientService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecipientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
