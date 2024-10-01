import { TestBed } from '@angular/core/testing';

import { SignedDataService } from './signed-data.service';

describe('SignedDataService', () => {
  let service: SignedDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignedDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
